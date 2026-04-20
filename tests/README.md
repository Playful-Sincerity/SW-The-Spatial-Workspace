# Tests

## Framework
**unittest** (Python stdlib — no dependencies, matching the project's stdlib-only constraint).

## Run Tests
```bash
python3 -m unittest discover tests/ -v
```

## What to Test First
- Smoke tests: generator script imports and runs
- Output validation: generated HTML is valid, SVG renders
- Layout logic: node positioning, connection routing

## Philosophy
- Smoke tests first, expand coverage as code grows
- auto-test.sh hook runs tests on Stop — tests must be discoverable
- Test files: `test_*.py`
