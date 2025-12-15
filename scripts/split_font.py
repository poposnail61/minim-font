import sys
import os
import re
import subprocess
import shutil
from fontTools.ttLib import TTFont

def check_dependencies():
    """Check if fonttools is installed."""
    try:
        import fontTools
    except ImportError:
        print("Error: 'fonttools' is not installed. Please install it:")
        print("  pip install fonttools brotli")
        sys.exit(1)

def parse_ranges(css_file):
    """Extract unicode-range values from a CSS file."""
    ranges = []
    try:
        with open(css_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Reference CSS file '{css_file}' not found.")
        sys.exit(1)
    
    # Regex to find unicode-range values
    matches = re.finditer(r'@font-face\s*\{[^}]*unicode-range:\s*([^;]+);', content)
    for match in matches:
        r = match.group(1).strip()
        if r not in ranges:
            ranges.append(r)
            
    # Reverse to keep the order from the file (Google fonts often puts specific ranges first)
    # We will trust the order in the file.
    return ranges

def get_font_weight_range(font_path):
    """Detect if font is variable and return weight range."""
    try:
        tt = TTFont(font_path)
        if 'fvar' in tt:
            fvar = tt['fvar']
            for axis in fvar.axes:
                if axis.axisTag == 'wght':
                    min_val = int(axis.minValue)
                    max_val = int(axis.maxValue)
                    return f"{min_val} {max_val}"
        
        # Fallback for static fonts (try to read OS/2 table or default to 400)
        # Using 400 as a safe default for static fonts if detection fails or is complex
        return "400"
    except Exception as e:
        print(f"Warning: Could not detect font weight range: {e}")
        return "400"

def split_font(font_path, css_ref_path, output_dir):
    check_dependencies()
    
    if not os.path.exists(font_path):
        print(f"Error: Font file '{font_path}' not found.")
        sys.exit(1)

    ranges = parse_ranges(css_ref_path)
    if not ranges:
        print("Error: No unicode-ranges found in the reference CSS.")
        sys.exit(1)
        
    weight_val = get_font_weight_range(font_path)
    print(f"Detected font-weight: {weight_val}")

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    font_filename = os.path.basename(font_path)
    base_name = os.path.splitext(font_filename)[0]
    # Remove spaces for file safety
    safe_base_name = base_name.replace(" ", "_")
    
    css_output_path = os.path.join(output_dir, f"{safe_base_name}.css")
    css_lines = []
    
    print(f"Target Font: {font_path}")
    print(f"Reference CSS: {css_ref_path}")
    print(f"Found {len(ranges)} ranges. Starting subsetting...")
    
    total_subsets = 0
    
    for i, r in enumerate(ranges):
        # Naming strategy: fontname_subset_index.woff2
        subset_filename = f"{safe_base_name}_{i}.woff2"
        subset_path = os.path.join(output_dir, subset_filename)
        
        # Build pyftsubset command
        # --flavor=woff2: Output WOFF2
        # --layout-features=*: Keep all OpenType features
        # --no-hinting: Drop hinting for smaller size (optional, but common for web)
        # --desubroutinize: Sometimes helps with compatibility/size
        # --unicodes: The range to keep
        # Build fontTools.subset command
        # Use sys.executable -m fontTools.subset to ensure we use the installed module
        cmd = [
            sys.executable,
            "-m",
            "fontTools.subset",
            font_path,
            f"--output-file={subset_path}",
            f"--unicodes={r.replace(' ', '')}",
            "--flavor=woff2",
            "--layout-features=*",
            "--no-hinting",
            "--desubroutinize"
        ]
        
        try:
            # Run the command with user text=True for proper string output
            result = subprocess.run(cmd, check=False, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"Warning: Failed to subset range {i}. Error: {result.stderr}")
                continue

            # Check if valid file was created
            if os.path.exists(subset_path):
                # Construct CSS rule
                css_rule = f"""@font-face {{
  font-family: '{base_name}';
  font-style: normal;
  font-weight: {weight_val};
  font-display: swap;
  src: url('./{subset_filename}') format('woff2');
  unicode-range: {r};
}}"""
                css_lines.append(css_rule)
                total_subsets += 1
            else:
                pass 
                # print(f"  [Refused] No file created for range {i}")

        except Exception as e:
            print(f"Error processing range {i}: {e}")
            
    # Write the cumulative CSS
    with open(css_output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(css_lines))
        
    print(f"\nSuccess! Created {total_subsets} subsets.")
    print(f"CSS File: {css_output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python split_font.py <font_path> <reference_css_path> [output_dir]")
        print("Example: python split_font.py myfont.ttf google_fonts.css ./output")
        sys.exit(1)
        
    font_arg = sys.argv[1]
    css_ref_arg = sys.argv[2]
    out_dir_arg = sys.argv[3] if len(sys.argv) > 3 else "dist"
    
    split_font(font_arg, css_ref_arg, out_dir_arg)
