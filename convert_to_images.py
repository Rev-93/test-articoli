import os
import glob
import fitz
import json

PDF_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pdf')
OUTPUT_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images')

def convert_pdfs_to_images():
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    
    pdf_files = glob.glob(os.path.join(PDF_FOLDER, '*.pdf'))
    pdf_files = sorted(pdf_files)
    
    if not pdf_files:
        print("Nessun file PDF trovato nella cartella pdf/")
        return
    
    print(f"Trovati {len(pdf_files)} file PDF")
    
    images_list = []
    seen = set()
    
    for pdf_file in pdf_files:
        filename = os.path.basename(pdf_file)
        series_code = os.path.splitext(filename)[0]
        
        print(f"Conversione: {filename}...")
        
        doc = fitz.open(pdf_file)
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            zoom = 2.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            output_filename = f"{series_code}_page{page_num + 1}.png"
            output_path = os.path.join(OUTPUT_FOLDER, output_filename)
            
            pix.save(output_path)
            print(f"  Salvato: {output_filename}")
            
            if series_code not in seen:
                seen.add(series_code)
                images_list.append({
                    'filename': output_filename,
                    'seriesCode': series_code
                })
        
        doc.close()
    
    images_list.sort(key=lambda x: x['seriesCode'])
    
    with open(os.path.join(OUTPUT_FOLDER, 'images.json'), 'w', encoding='utf-8') as f:
        json.dump(images_list, f, indent=2)
    
    with open(os.path.join(OUTPUT_FOLDER, 'images.js'), 'w', encoding='utf-8') as f:
        f.write('const IMAGES_LIST = ')
        json.dump(images_list, f, indent=2)
        f.write(';\n')
    
    print(f"\nCreato file images.json con {len(images_list)} articoli")
    print("Creato file images.js con la lista delle immagini")
    print("Conversione completata!")

if __name__ == '__main__':
    convert_pdfs_to_images()
