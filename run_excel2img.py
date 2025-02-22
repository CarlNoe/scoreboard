import sys
import excel2img

def main():
    # Usage: python run_excel2img.py input.xlsx output.png sheetName [range]
    if len(sys.argv) < 4:
        print("Usage: python run_excel2img.py input.xlsx output.png sheetName [range]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    sheet = sys.argv[3]
    # Optional: specify a cell range, e.g. "Sheet2!B2:C15"
    cell_range = sys.argv[4] if len(sys.argv) > 4 else None

    try:
        excel2img.export_img(input_file, output_file, sheet, cell_range)
        print("Image exported successfully.")
    except Exception as e:
        print("Error exporting image:", e)

if __name__ == "__main__":
    main()
