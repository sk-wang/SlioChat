const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const CleanCSS = require('clean-css');
const https = require('https');

async function downloadResource(url) {
    try {
        const response = await fetch(url);
        return await response.text();
    } catch (error) {
        console.error(`Error downloading ${url}:`, error);
        throw error;
    }
}

function minifyCSS(code) {
    const cleanCSS = new CleanCSS({
        level: 2
    });
    return cleanCSS.minify(code).styles;
}

async function inlineResources() {
    const htmlPath = path.resolve(__dirname, '../index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const $ = cheerio.load(htmlContent);

    // 收集所有外部JavaScript内容
    let allJsContent = '';
    const scriptPromises = $('script[src]').map(async (_, element) => {
        const url = $(element).attr('src');
        if (url.startsWith('http')) {
            const content = await downloadResource(url);
            allJsContent += content + '\n';
            $(element).remove(); // 移除原始script标签
        }
    }).get();

    // 收集所有外部CSS内容
    let allCssContent = '';
    const stylePromises = $('link[rel="stylesheet"]').map(async (_, element) => {
        const url = $(element).attr('href');
        if (url.startsWith('http')) {
            const content = await downloadResource(url);
            allCssContent += content + '\n';
            $(element).remove(); // 移除原始link标签
        }
    }).get();

    // 等待所有资源下载完成
    await Promise.all([...scriptPromises, ...stylePromises]);

    // 压缩并插入合并后的JavaScript
    if (allJsContent) {
        $('head').append(`<script>${allJsContent}</script>`);
    }

    // 压缩并插入合并后的CSS
    if (allCssContent) {
        const minifiedCss = minifyCSS(allCssContent);
        $('head').append(`<style>${minifiedCss}</style>`);
    }

    // 保存修改后的 HTML
    fs.writeFileSync(htmlPath, $.html());
    console.log('Successfully inlined and bundled all CDN resources');
}

// 下载 PDF.js worker 脚本并将其转换为 base64 编码的 data URI
async function processPdfWorker() {
    console.log('正在处理 PDF.js worker 脚本...');
    
    // PDF.js worker 脚本的 URL
    const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    try {
        // 下载 worker 脚本
        const workerScript = await new Promise((resolve, reject) => {
            https.get(WORKER_URL, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`下载失败，状态码: ${response.statusCode}`));
                    return;
                }

                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    console.log('PDF.js worker 脚本下载完成');
                    resolve(data);
                });
            }).on('error', (err) => {
                reject(err);
            });
        });

        // 将脚本转换为 base64 编码的 data URI
        const base64Script = Buffer.from(workerScript).toString('base64');
        const dataURI = `data:application/javascript;base64,${base64Script}`;
        
        console.log('PDF.js worker 脚本已转换为 data URI');
        return dataURI;
    } catch (error) {
        console.error('处理 PDF.js worker 脚本失败:', error.message);
        // 如果失败，返回原始 CDN URL
        return WORKER_URL;
    }
}

// 主函数
async function main() {
    try {
        // 读取 HTML 文件
        const htmlPath = path.resolve(__dirname, '../index.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // 下载并处理 PDF.js worker 脚本
        const pdfWorkerDataURI = await processPdfWorker();
        
        // 使用 cheerio 解析 HTML
        const $ = cheerio.load(htmlContent);
        
        // 替换 PDF.js worker 脚本路径
        const scriptContent = $('script').filter(function() {
            return $(this).text().includes('pdfjsLib.GlobalWorkerOptions.workerSrc');
        }).text();
        
        if (scriptContent) {
            const updatedScript = scriptContent.replace(
                /pdfjsLib\.GlobalWorkerOptions\.workerSrc\s*=\s*['"]https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/[^'"]+['"]/,
                `pdfjsLib.GlobalWorkerOptions.workerSrc = '${pdfWorkerDataURI}'`
            );
            
            $('script').filter(function() {
                return $(this).text().includes('pdfjsLib.GlobalWorkerOptions.workerSrc');
            }).text(updatedScript);
            
            // 保存修改后的 HTML
            fs.writeFileSync(htmlPath, $.html(), 'utf8');
            console.log('HTML 文件已更新，PDF.js worker 脚本已内联');
        } else {
            console.warn('未找到 PDF.js worker 配置脚本，跳过更新');
        }
        
        // 这里可以添加其他构建步骤...
        
    } catch (error) {
        console.error('构建过程失败:', error.message);
        process.exit(1);
    }
}

// 执行内联过程
inlineResources().catch(console.error);

main(); 