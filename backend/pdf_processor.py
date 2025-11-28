import PyPDF2
import io
from pdfminer.high_level import extract_text as pdfminer_extract_text

class PDFProcessor:
    def __init__(self):
        pass
    
    def extract_text_from_pdf(self, file):
        """Extract text content from PDF file"""
        try:
            file_bytes = file.read()
            file.seek(0)
            text = self._extract_with_pypdf(file_bytes)
            if text and len(text.strip()) > 50:
                return text.strip()

            # Fallback to PDFMiner for better text extraction
            text = self._extract_with_pdfminer(file_bytes)
            if text and len(text.strip()) > 0:
                return text.strip()

            return None
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
            return None
    
    def extract_text_from_file_path(self, file_path):
        """Extract text from PDF file path"""
        try:
            with open(file_path, 'rb') as file:
                file_bytes = file.read()
                text = self._extract_with_pypdf(file_bytes)
                if text and len(text.strip()) > 50:
                    return text.strip()

                text = self._extract_with_pdfminer(file_bytes)
                if text and len(text.strip()) > 0:
                    return text.strip()

                return None
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
            return None

    def _extract_with_pypdf(self, file_bytes):
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            text = ""
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text
        except Exception as e:
            print(f"PyPDF2 extraction failed: {e}")
            return None

    def _extract_with_pdfminer(self, file_bytes):
        try:
            return pdfminer_extract_text(io.BytesIO(file_bytes))
        except Exception as e:
            print(f"PDFMiner extraction failed: {e}")
            return None
