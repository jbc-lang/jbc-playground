"""Write web/jbc-words.json: the words the editor colours, from the pinned jbcc.

Run inside the pinned jbcc, as `just words`:
    uvx --from jbcc==<version> python tools/jbc-words.py > web/jbc-words.json

jbcc has no public word list yet, so this reads its tables (BUILTINS,
SYSTEM_CONSTANTS) and the words its parser compares, and asks the browser
translator which statements it refuses. Replace it with a jbcc API once
one exists.
"""

import inspect
import json
import os
import re
import sys
import tempfile
from contextlib import redirect_stderr
from io import StringIO
from pathlib import Path

import jbcc
import jbcc.compiler as compiler
from jbcc.browser import translate

source = inspect.getsource(compiler)

# Words the parser compares the current or next token with: statements and
# the clauses inside them (THEN, SETTING, TO...).
compared = set()
for match in re.finditer(r"\.word\s*(?:==|!=)\s*'([A-Z][A-Z0-9.$]*)'", source):
    compared.add(match.group(1))
for match in re.finditer(r"\.word\s*(?:not\s+)?in\s*[\(\{]([^\)\}]*)[\)\}]", source):
    compared.update(re.findall(r"'([A-Z][A-Z0-9.$]*)'", match.group(1)))
for name in dir(compiler):
    value = getattr(compiler, name)
    if name.isupper() and isinstance(value, (set, frozenset)) and all(isinstance(v, str) for v in value):
        compared.update(v for v in value if re.fullmatch(r"[A-Z][A-Z0-9.$]*", v))

functions = sorted(name for name in compiler.BUILTINS if re.fullmatch(r"[A-Z][A-Z0-9.$]*", name))
system = sorted("@" + name for name in compiler.SYSTEM_CONSTANTS)
system += sorted(set(re.findall(r"'@([A-Z][A-Z0-9.]*)'", source)) - set(compiler.SYSTEM_CONSTANTS) and
                 {"@" + n for n in re.findall(r"'@([A-Z][A-Z0-9.]*)'", source)} - set(system))
statements = sorted(compared - set(functions))


def refused(words):
    """The words whose small programs the browser translator refuses as
    unavailable in the browser."""
    templates = [
        "{w}\n", "{w} X\n", "{w} X ELSE NULL\n", "{w} X THEN NULL\n", "{w} X FROM Y ELSE NULL\n",
        "{w} X TO Y ELSE NULL\n", "{w} X TO Y THEN NULL ELSE NULL\n", "Y = {w}(1)\n", "CRT {w}\n",
        "{w} X SETTING Y THEN NULL ELSE NULL\n", "{w} 'X' CAPTURING Y\n",
    ]
    found = set()
    with tempfile.TemporaryDirectory() as work:
        os.chdir(work)
        for word in words:
            for template in templates:
                path = Path("t.b")
                path.write_text("X = 1 ; Y = 1\n" + template.format(w=word), encoding="utf-8")
                errors = StringIO()
                try:
                    with redirect_stderr(errors):
                        translate([path], include_resolver=lambda *_: None, include_depth=16)
                except Exception as error:
                    errors.write(str(error))
                if re.search(r"\b%s\b[^\n]* is unavailable in the browser" % re.escape(word), errors.getvalue()):
                    found.add(word)
                    break
    return sorted(found)


unavailable = refused(statements + functions)
json.dump(
    {
        "jbcc": getattr(jbcc, "__version__", None) or __import__("importlib.metadata").metadata.version("jbcc"),
        "statements": statements,
        "functions": functions,
        "system": sorted(set(system)),
        "unavailable": unavailable,
    },
    sys.stdout,
    indent=1,
)
sys.stdout.write("\n")
