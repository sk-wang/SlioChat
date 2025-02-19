const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function downloadResource(url) {
    try {
        const response = await fetch(url);
        return await response.text();
    } catch (error) {
        console.error(`Error downloading ${url}:`, error);
        throw error;
    }
}

async function inlineResources() {
    const htmlPath = path.resolve(__dirname, '../index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const $ = cheerio.load(htmlContent);

    // 处理所有外部JavaScript文件
    const scriptPromises = $('script[src]').map(async (_, element) => {
        const url = $(element).attr('src');
        if (url.startsWith('http')) {
            const content = await downloadResource(url);
            $(element).removeAttr('src').text(content);
        }
    }).get();

    // 处理所有外部CSS文件
    const stylePromises = $('link[rel="stylesheet"]').map(async (_, element) => {
        const url = $(element).attr('href');
        if (url.startsWith('http')) {
            const content = await downloadResource(url);
            $(element).replaceWith(`<style>${content}</style>`);
        }
    }).get();

    // 等待所有资源下载完成
    await Promise.all([...scriptPromises, ...stylePromises]);

    // 保存修改后的 HTML
    fs.writeFileSync(htmlPath, $.html());
    console.log('Successfully inlined all CDN resources');
}

// 执行内联过程
inlineResources().catch(console.error); 