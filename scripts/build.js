const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

async function downloadResource(url) {
    try {
        const response = await fetch(url);
        return await response.text();
    } catch (error) {
        console.error(`Error downloading ${url}:`, error);
        throw error;
    }
}

async function minifyJS(code) {
    try {
        const result = await minify(code, {
            compress: true,
            mangle: true
        });
        return result.code;
    } catch (error) {
        console.error('Error minifying JavaScript:', error);
        return code;
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
        const minifiedJs = await minifyJS(allJsContent);
        $('head').append(`<script>${minifiedJs}</script>`);
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

// 执行内联过程
inlineResources().catch(console.error); 