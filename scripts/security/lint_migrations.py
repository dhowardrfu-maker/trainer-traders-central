#!/usr/bin/env python3
"""
Lint Supabase SQL migrations for common security foot-guns.

Checks every .sql file under the given directory and fails the build if any
risky pattern is found. Intended for CI; safe to run locally too.

Rules:
  R1  DISABLE ROW LEVEL SECURITY                         — never disable RLS
  R2  CREATE POLICY ... USING (true)                     — wide-open policy
  R3  CREATE POLICY ... WITH CHECK (true)                — wide-open insert/update
  R4  CREATE TABLE public.* without a later ENABLE RLS   — table left unprotected
  R5  SECURITY DEFINER function without `SET search_path`— search_path hijack risk
  R6  GRANT ... TO public|anon on SECURITY DEFINER fn    — anon execute exposure
  R7  EXECUTE format(... || ...)                          — possible SQL injection
  R8  Hard-coded JWT / service_role secret strings       — leaked credentials

Exit code 0 on clean, 1 on any violation.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

VIOLATIONS: list[tuple[str, str, int, str]] = []

RULES = [
    ("R1", re.compile(r"\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b", re.I),
     "RLS must never be disabled on a public table"),
    ("R2", re.compile(r"USING\s*\(\s*true\s*\)", re.I),
     "Policy USING (true) is wide-open — scope by auth.uid() or role"),
    ("R3", re.compile(r"WITH\s+CHECK\s*\(\s*true\s*\)", re.I),
     "Policy WITH CHECK (true) is wide-open — scope by auth.uid() or role"),
    ("R6", re.compile(r"GRANT\s+EXECUTE[^;]+TO\s+(?:public|anon)\b", re.I),
     "Do not GRANT EXECUTE on functions to public/anon"),
    ("R7", re.compile(r"EXECUTE\s+format\s*\([^)]*\|\|", re.I),
     "Dynamic SQL via string concat — use parameterised format() %L/%I"),
    ("R8", re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}"),
     "Looks like a hard-coded JWT — move to a secret"),
    ("R8b", re.compile(r"service_role[^\n]{0,40}=", re.I),
     "Service role reference inside a migration — never embed service-role keys"),
]


WAIVER_RE = re.compile(r"--\s*security-lint:\s*allow\s+([A-Za-z0-9, ]+)", re.I)


def _waived_lines(raw: str) -> dict[int, set[str]]:
    """Map of {line_number: {rule_codes}} the file explicitly waives.
    A waiver applies to the same line and the next non-blank line."""
    waivers: dict[int, set[str]] = {}
    lines = raw.splitlines()
    for idx, line in enumerate(lines, start=1):
        m = WAIVER_RE.search(line)
        if not m:
            continue
        codes = {c.strip().upper() for c in m.group(1).split(",") if c.strip()}
        waivers.setdefault(idx, set()).update(codes)
        # also apply to the next non-blank line
        for j in range(idx + 1, len(lines) + 1):
            if lines[j - 1].strip():
                waivers.setdefault(j, set()).update(codes)
                break
    return waivers


def check_file(path: Path) -> None:
    text = path.read_text(encoding="utf-8", errors="replace")
    waivers = _waived_lines(text)

    # Strip line and block comments to avoid false positives in commentary,
    # but preserve newlines so line numbers stay accurate.
    no_line = re.sub(r"--[^\n]*", "", text)
    stripped = re.sub(r"/\*.*?\*/",
                      lambda m: "\n" * m.group(0).count("\n"),
                      no_line, flags=re.S)

    def report(code: str, offset: int, message: str) -> None:
        line_no = stripped[:offset].count("\n") + 1
        if code.upper() in waivers.get(line_no, set()):
            return
        VIOLATIONS.append((str(path), code, line_no, message))

    for code, pattern, message in RULES:
        for m in pattern.finditer(stripped):
            report(code, m.start(), message)

    # R4: every CREATE TABLE public.<name> must have ENABLE RLS on that table
    # somewhere in this same migration (or already-existing migrations — but
    # we keep this strict per-file to avoid false negatives).
    for m in re.finditer(
        r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.(\w+)", stripped, re.I
    ):
        table = m.group(1)
        if not re.search(
            rf"ALTER\s+TABLE\s+(?:public\.)?{re.escape(table)}\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY",
            stripped,
            re.I,
        ):
            line_no = stripped[: m.start()].count("\n") + 1
            VIOLATIONS.append(
                (str(path), "R4", line_no,
                 f"Table public.{table} created without ENABLE ROW LEVEL SECURITY")
            )

    # R5: SECURITY DEFINER function bodies must SET search_path
    for m in re.finditer(
        r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b.*?(?=\$\$|\$function\$)",
        stripped,
        re.I | re.S,
    ):
        decl = m.group(0)
        if re.search(r"SECURITY\s+DEFINER", decl, re.I) and not re.search(
            r"SET\s+search_path", decl, re.I
        ):
            line_no = stripped[: m.start()].count("\n") + 1
            VIOLATIONS.append(
                (str(path), "R5", line_no,
                 "SECURITY DEFINER function must SET search_path")
            )


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: lint_migrations.py <migrations-dir>", file=sys.stderr)
        return 2

    root = Path(argv[1])
    if not root.is_dir():
        print(f"not a directory: {root}", file=sys.stderr)
        return 2

    files = sorted(root.rglob("*.sql"))
    if not files:
        print(f"no .sql files under {root}")
        return 0

    for f in files:
        check_file(f)

    if VIOLATIONS:
        print("\n❌ Migration security lint failed:\n")
        for path, code, line, msg in VIOLATIONS:
            print(f"  {path}:{line}  [{code}] {msg}")
        print(f"\n{len(VIOLATIONS)} issue(s) across {len(files)} file(s).")
        return 1

    print(f"✅ {len(files)} migration(s) passed security lint.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
