import os
import sys
import runpy


def main():
    target = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Workspace.py")
    if not os.path.exists(target):
        sys.stderr.write("Workspace.py not found\n")
        sys.exit(1)
    argv_backup = sys.argv[:]
    try:
        sys.argv = [target] + argv_backup[1:]
        runpy.run_path(target, run_name="__main__")
    except SystemExit as e:
        code = e.code if isinstance(e.code, int) or e.code is None else 1
        sys.exit(0 if code is None else code)
    finally:
        sys.argv = argv_backup


if __name__ == "__main__":
    main()

