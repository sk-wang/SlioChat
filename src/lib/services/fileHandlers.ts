import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import jschardet from 'jschardet';
import { settingsStore } from '$lib/stores/settings.svelte';
import { uiStore } from '$lib/stores/ui.svelte';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

export interface FileContent {
  fileName: string;
  content: string;
  type: string;
  size: number;
}

export async function processFile(file: File): Promise<FileContent> {
  const fileName = file.name;
  const fileType = file.type;
  const fileSize = file.size;

  let content: string;

  try {
    if (fileType === 'application/pdf') {
      content = await extractPdfText(file);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel'
    ) {
      content = await extractExcelText(file);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx') || file.name.endsWith('.doc')
    ) {
      content = await extractWordText(file);
    } else if (fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileName)) {
      uiStore.showToast(`正在解析图片: ${fileName}...`, 'info');
      const base64 = await extractImageBase64(file);
      const description = await describeImageWithVLM(base64);
      content = `[图片解析结果]\n文件名: ${fileName}\n图片类型: ${fileType}\n文件大小: ${(fileSize / 1024).toFixed(1)}KB\n\n图片内容描述:\n${description}`;
      uiStore.showToast(`图片解析完成: ${fileName}`, 'success');
    } else {
      content = await extractTextContent(file);
    }
  } catch (error) {
    console.error('File processing error:', error);
    uiStore.showToast(`文件处理失败: ${fileName}`, 'error');
    throw error;
  }

  return {
    fileName,
    content,
    type: fileType,
    size: fileSize,
  };
}

async function describeImageWithVLM(base64: string): Promise<string> {
  const config = settingsStore.config;
  const model = config.defaultVlm || 'qwen2.5-vl-3b-instruct';
  
  try {
    const response = await fetch(config.defaultUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.defaultKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请详细描述这张图片的内容，包括图片中的文字、物体、场景、颜色等所有可见元素。如果图片包含文字，请准确识别并提取出来。',
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`VLM request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '无法解析图片内容';
  } catch (error) {
    console.error('VLM Error:', error);
    throw new Error('图片解析服务请求失败');
  }
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText.trim();
}

async function extractExcelText(file: File): Promise<string> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  let result = '';
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    result += 'Sheet: ' + sheetName + '\n' + csv + '\n\n';
  });
  
  return result.trim();
}

async function extractWordText(file: File): Promise<string> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractImageBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function extractTextContent(file: File): Promise<string> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  const detected = jschardet.detect(String.fromCharCode(...uint8Array.slice(0, 1024)));
  const encoding = detected.encoding || 'utf-8';
  
  const decoder = new TextDecoder(encoding.toLowerCase());
  return decoder.decode(uint8Array);
}

export function getFileIcon(fileType: string): string {
  if (fileType === 'application/pdf') return 'pdf';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'excel';
  if (fileType.includes('word')) return 'word';
  if (fileType.startsWith('image/')) return 'image';
  return 'text';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
