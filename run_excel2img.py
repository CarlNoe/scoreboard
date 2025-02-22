import sys
import os
import excel2img

def main():
    # Usage: python run_excel2img.py input.xlsx output.png sheet_name [range]
    if len(sys.argv) < 4:
        print("Usage: python run_excel2img.py input.xlsx output.png sheet_name [range]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    sheet = sys.argv[3]
    _range = sys.argv[4] if len(sys.argv) >= 5 else None

    # For debugging, print the absolute path of the input file
    abs_input_file = os.path.abspath(input_file)
    if not os.path.exists(abs_input_file):
        print("Excel file does not exist:", abs_input_file)
        sys.exit(1)
    else:
        print("Found Excel file at:", abs_input_file)

    try:
        excel2img.export_img(input_file, output_file, sheet, _range)
        print("Image exported successfully to", output_file)
    except Exception as e:
        print("Error exporting image:", e)
        sys.exit(1)

if __name__ == "__main__":
    main()
