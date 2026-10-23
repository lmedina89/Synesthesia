#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --version
for file in $(find assets -name '*.js'); do node --check "$file" >/dev/null; done
node --test tests/*.test.mjs
python3 - <<'PY'
import json,hashlib,pathlib,re
p=pathlib.Path('.')
release=json.loads((p/'release.json').read_text())
for name,sha in release['sha256'].items():
    actual=hashlib.sha256((p/name).read_bytes()).hexdigest()
    assert actual==sha, (name,'hash does not match release manifest')
standalone=(p/'standalone.html').read_text()
modular=(p/'assets/core/midi.js').read_text()
regression='beat<endBeat-0.0000001'
assert regression in standalone and regression in modular
assert 'Garden_Notes_v0.14.1_PRIVATE_Songs.html' in standalone
assert len(list((p/'assets').rglob('*.js')))==release['module_count']
print('Validated manifest hashes, 25 JS modules and standalone regression patch.')
PY
