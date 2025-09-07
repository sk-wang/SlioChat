const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const https = require('https');

// 配置
const CONFIG = {
  timeout: 30000, // 下载超时时间 (ms)
  retries: 3,     // 下载重试次数
  verbose: true,  // 是否显示详细日志
  minify: {
    html: true,   // 是否压缩HTML
    js: true,     // 是否压缩JS
    css: true,    // 是否压缩CSS
    removeComments: true, // 是否移除注释（除了特殊注释）
    conservativeCollapse: true, // 保守地折叠空白（保留必要的空格）
  }
};

// 工具函数：下载资源（带重试）
async function downloadResource(url) {
  for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
    try {
      if (CONFIG.verbose) {
        console.log(`[${attempt}/${CONFIG.retries}] 下载: ${url}`);
      }
      
      // 设置超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Node.js build script)'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`下载失败，状态码: ${response.status}`);
      }
      
      const content = await response.text();
      const sizeKb = (content.length / 1024).toFixed(2);
      
      if (CONFIG.verbose) {
        console.log(`✅ 成功下载: ${url} (${sizeKb} KB)`);
      }
      
      return content;
    } catch (error) {
      console.error(`❌ 下载出错 ${url} (尝试 ${attempt}/${CONFIG.retries}): ${error.message}`);
      
      if (attempt === CONFIG.retries) {
        throw new Error(`下载失败: ${url}, 错误: ${error.message}`);
      }
      
      // 延迟后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// JS压缩函数
async function minifyJS(code) {
  try {
    // 尝试使用terser
    try {
      const { minify } = require('terser');
      const result = await minify(code, {
        compress: {
          drop_console: false,
          dead_code: true,
          conditionals: true,
          booleans: true,
          unused: true,
          if_return: true,
          join_vars: true,
          drop_debugger: true
        },
        mangle: true,
        output: {
          beautify: false,
          comments: /^!/  // 保留以!开头的注释
        }
      });
      
      return result.code;
    } catch (e) {
      // 如果没有terser，使用简单的压缩方法
      console.log('⚠️ 未找到Terser或处理错误，使用简单JS压缩:', e.message);
      return code
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1') // 移除注释
        .replace(/^\s*\n/gm, '') // 移除空行
        .replace(/\s+/g, ' ') // 压缩空白
        .replace(/;\s*}/g, '}') // 移除分号前的空格
        .replace(/{\s*/g, '{') // 移除大括号后的空格
        .replace(/}\s*/g, '}') // 移除大括号前的空格
        .replace(/,\s*/g, ',') // 移除逗号后的空格
        .replace(/:\s*/g, ':') // 移除冒号后的空格
        .replace(/;\s*/g, ';') // 移除分号后的空格
        .trim();
    }
  } catch (error) {
    console.error('JS压缩失败:', error);
    return code; // 出错时返回原始代码
  }
}

// CSS压缩函数
async function minifyCSS(code) {
  try {
    // 尝试使用 clean-css 如果存在
    try {
      const CleanCSS = require('clean-css');
      const cleanCSS = new CleanCSS({ 
        level: {
          1: {
            all: true,
            specialComments: '/*!*' // 保留特殊注释
          },
          2: {
            all: true,
            restructureRules: true
          }
        } 
      });
      const result = cleanCSS.minify(code);
      return result.styles;
    } catch (e) {
      // 如果没有 clean-css，使用简单的压缩方法
      console.log('⚠️ 未找到CleanCSS或处理错误，使用简单CSS压缩:', e.message);
      return code
        .replace(/\/\*(?!\!)[^*]*\*+([^\/][^*]*\*+)*\//g, '') // 移除注释，保留/*!开头的
        .replace(/\s+/g, ' ') // 压缩空白
        .replace(/;\s*}/g, '}') // 移除分号前的空格
        .replace(/{\s*/g, '{') // 移除大括号后的空格
        .replace(/}\s*/g, '}') // 移除大括号前的空格
        .replace(/,\s*/g, ',') // 移除逗号后的空格
        .replace(/:\s*/g, ':') // 移除冒号后的空格
        .replace(/;\s*/g, ';') // 移除分号后的空格
        .trim();
    }
  } catch (error) {
    console.error('CSS压缩失败:', error);
    return code; // 出错时返回原始代码
  }
}

// HTML压缩函数
async function minifyHTML(html) {
  try {
    // 尝试使用html-minifier-terser
    try {
      const minifier = require('html-minifier-terser');
      // 注意：minifier.minify返回Promise，需要await
      return await minifier.minify(html, {
        collapseWhitespace: true,
        conservativeCollapse: CONFIG.minify.conservativeCollapse,
        removeComments: CONFIG.minify.removeComments,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        minifyCSS: false, // 我们已经单独压缩CSS
        minifyJS: false,  // 我们已经单独压缩JS
        processScripts: ['application/ld+json'],
        removeEmptyAttributes: true,
        removeOptionalTags: true,
        removeTagWhitespace: false, // 这可能影响显示
        sortAttributes: true,
        sortClassName: true,
        useShortDoctype: true
      });
    } catch (e) {
      console.log('⚠️ 未找到html-minifier-terser，HTML将不会被压缩:', e.message);
      return html;
    }
  } catch (error) {
    console.error('HTML压缩失败:', error);
    return html; // 出错时返回原始代码
  }
}

// 主函数：内联外部资源
async function inlineResources() {
  const htmlPath = path.resolve(__dirname, '../index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const $ = cheerio.load(htmlContent, { decodeEntities: false });
  
  console.log('开始处理外部资源...');
  
  // 1. 收集所有外部脚本（包括CDN和本地文件）
  const externalScripts = [];
  const localScripts = [];
  $('script[src]').each((_, element) => {
    const url = $(element).attr('src');
    if (url && url.startsWith('http')) {
      externalScripts.push({ element, url });
    } else if (url) {
      // 本地JS文件
      localScripts.push({ element, url });
    }
  });
  
  // 2. 收集所有外部样式（包括CDN和本地文件）
  const externalStyles = [];
  const localStyles = [];
  $('link[rel="stylesheet"]').each((_, element) => {
    const url = $(element).attr('href');
    if (url && url.startsWith('http')) {
      externalStyles.push({ element, url });
    } else if (url) {
      // 本地CSS文件
      localStyles.push({ element, url });
    }
  });
  
  console.log(`发现 ${externalScripts.length} 个外部JS文件, ${localScripts.length} 个本地JS文件, ${externalStyles.length} 个外部CSS文件, ${localStyles.length} 个本地CSS文件`);
  
  // 3. 按顺序处理所有JS文件，先外部库，再本地代码
  let allJsContent = '';
  
  // 4. 先下载所有外部JS文件（外部库依赖）
  for (const { element, url } of externalScripts) {
    try {
      const content = await downloadResource(url);
      // 添加源URL作为注释，便于调试
      allJsContent += `\n/* === ${url} === */\n${content}\n`;
      $(element).remove(); // 移除原始脚本标签
    } catch (error) {
      console.error(`跳过JS文件 ${url}: ${error.message}`);
      // 保留原始标签，不删除，确保降级使用外部资源
    }
  }
  
  // 5. 再读取本地JS文件（依赖外部库）
  for (const { element, url } of localScripts) {
    try {
      const localPath = path.resolve(__dirname, '..', url);
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf8');
        // 添加源文件路径作为注释，便于调试
        allJsContent += `\n/* === 本地文件: ${url} === */\n${content}\n`;
        $(element).remove(); // 移除原始脚本标签
        console.log(`✅ 内联本地JS文件: ${url}`);
      } else {
        console.error(`❌ 本地JS文件不存在: ${localPath}`);
      }
    } catch (error) {
      console.error(`处理本地JS文件失败 ${url}: ${error.message}`);
    }
  }
  
  // 6. 读取本地CSS文件并按顺序下载外部CSS文件
  let allCssContent = '';
  
  // 先处理本地CSS文件
  for (const { element, url } of localStyles) {
    try {
      const localPath = path.resolve(__dirname, '..', url);
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf8');
        // 添加源文件路径作为注释，便于调试
        allCssContent += `\n/* === 本地文件: ${url} === */\n${content}\n`;
        $(element).remove(); // 移除原始样式标签
        console.log(`✅ 内联本地CSS文件: ${url}`);
      } else {
        console.error(`❌ 本地CSS文件不存在: ${localPath}`);
      }
    } catch (error) {
      console.error(`处理本地CSS文件失败 ${url}: ${error.message}`);
    }
  }
  
  // 再处理外部CSS文件
  for (const { element, url } of externalStyles) {
    try {
      const content = await downloadResource(url);
      // 添加源URL作为注释，便于调试
      allCssContent += `\n/* === ${url} === */\n${content}\n`;
      $(element).remove(); // 移除原始样式标签
    } catch (error) {
      console.error(`跳过CSS文件 ${url}: ${error.message}`);
      // 保留原始标签，不删除，确保降级使用外部资源
    }
  }
  
  // 7. 压缩并插入合并后的JS内容
  if (allJsContent) {
    const originalSize = allJsContent.length;
    // 检查minifyJS是否返回Promise
    let compressedJs;
    try {
      compressedJs = CONFIG.minify.js ? await minifyJS(allJsContent) : allJsContent;
    } catch (error) {
      console.error('JS压缩失败，使用未压缩版本:', error.message);
      compressedJs = allJsContent;
    }
    const compressedSize = compressedJs.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
    
    $('body').append(`<script>${compressedJs}</script>`);
    console.log(`✅ 合并了 ${localScripts.length + externalScripts.length} 个JS文件 (本地${localScripts.length}个 + CDN${externalScripts.length}个) (${(originalSize / 1024).toFixed(2)} KB → ${(compressedSize / 1024).toFixed(2)} KB, 节省 ${savings}%)`);
  }
  
  // 8. 压缩并插入合并后的CSS内容
  if (allCssContent) {
    try {
      const originalSize = allCssContent.length;
      // 检查minifyCSS是否返回Promise
      let compressedCss;
      try {
        compressedCss = CONFIG.minify.css ? await minifyCSS(allCssContent) : allCssContent;
      } catch (error) {
        console.error('CSS压缩失败，使用未压缩版本:', error.message);
        compressedCss = allCssContent;
      }
      const compressedSize = compressedCss.length;
      const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
      
      $('head').append(`<style>${compressedCss}</style>`);
      console.log(`✅ 合并了 ${localStyles.length + externalStyles.length} 个CSS文件 (本地${localStyles.length}个 + CDN${externalStyles.length}个) (${(originalSize / 1024).toFixed(2)} KB → ${(compressedSize / 1024).toFixed(2)} KB, 节省 ${savings}%)`);
    } catch (error) {
      // CSS压缩失败，使用未压缩的CSS
      console.error('CSS压缩失败，使用未压缩版本:', error.message);
      $('head').append(`<style>${allCssContent}</style>`);
    }
  }
  
  // 9. 压缩页面上的行内JS脚本
  if (CONFIG.minify.js) {
    const promises = [];
    $('script').each((_, element) => {
      const script = $(element);
      const src = script.attr('src');
      
      // 跳过有src属性的脚本
      if (!src) {
        const content = script.html();
        if (content && content.trim()) {
          promises.push((async () => {
            try {
              const minified = await minifyJS(content);
              script.html(minified);
            } catch (err) {
              console.error('内联JS压缩失败:', err.message);
            }
          })());
        }
      }
    });
    
    // 等待所有内联JS压缩完成
    await Promise.all(promises);
    console.log('✅ 压缩了页面上的行内JS脚本');
  }
  
  // 10. 压缩页面上的行内CSS样式
  if (CONFIG.minify.css) {
    const promises = [];
    $('style').each((_, element) => {
      const style = $(element);
      const content = style.html();
      
      if (content && content.trim()) {
        promises.push((async () => {
          try {
            const minified = await minifyCSS(content);
            style.html(minified);
          } catch (err) {
            console.error('内联CSS压缩失败:', err.message);
          }
        })());
      }
    });
    
    // 等待所有内联CSS压缩完成
    await Promise.all(promises);
    console.log('✅ 压缩了页面上的行内CSS样式');
  }
  
  // 11. 保存修改后的HTML
  let finalHtml = $.html();
  const originalHtmlSize = finalHtml.length;
  
  // 12. 压缩整个HTML
  if (CONFIG.minify.html) {
    try {
      finalHtml = await minifyHTML(finalHtml);
      const compressedHtmlSize = finalHtml.length;
      const htmlSavings = ((originalHtmlSize - compressedHtmlSize) / originalHtmlSize * 100).toFixed(2);
      console.log(`✅ 压缩了HTML (${(originalHtmlSize / 1024).toFixed(2)} KB → ${(compressedHtmlSize / 1024).toFixed(2)} KB, 节省 ${htmlSavings}%)`);
    } catch (error) {
      console.error('HTML压缩失败:', error.message);
    }
  }
  
  // 输出到dist目录
  const distDir = path.resolve(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  const outputPath = path.resolve(distDir, 'index.html');
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ HTML处理完成，最终文件大小: ${(finalHtml.length / 1024).toFixed(2)} KB`);
  console.log(`✅ 已输出到 dist/index.html`);
}

// 处理 PDF.js worker 脚本
async function processPdfWorker() {
  console.log('正在处理 PDF.js worker 脚本...');
  
  // PDF.js worker 脚本的 URL
  const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  
  try {
    // 下载 worker 脚本
    const workerScript = await downloadResource(WORKER_URL);
    
    // 转换为 base64
    const base64Script = Buffer.from(workerScript).toString('base64');
    const dataURI = `data:application/javascript;base64,${base64Script}`;
    
    console.log(`✅ PDF.js worker 脚本已转换为 data URI (${(base64Script.length / 1024).toFixed(2)} KB)`);
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
    console.log('🚀 开始构建过程...');
    
    // 1. 先内联外部资源
    await inlineResources();
    
    // 2. 处理 PDF.js worker
    const pdfWorkerDataURI = await processPdfWorker();
    
    // 读取dist目录中的HTML文件
    const distOutputPath = path.resolve(__dirname, '../dist/index.html');
    if (!fs.existsSync(distOutputPath)) {
      console.error('❌ dist/index.html 文件不存在');
      return;
    }
    
    let htmlContent = fs.readFileSync(distOutputPath, 'utf8');
    const $ = cheerio.load(htmlContent, { decodeEntities: false });
    
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
      
      // 更新dist目录中的HTML文件
      const distOutputPath = path.resolve(__dirname, '../dist/index.html');
      if (fs.existsSync(distOutputPath)) {
        fs.writeFileSync(distOutputPath, $.html());
      }
      console.log('✅ PDF.js worker 脚本配置已更新');
    } else {
      console.warn('⚠️ 未找到 PDF.js worker 配置脚本，跳过更新');
    }
    
    // 最终文件大小统计
    const finalSize = fs.statSync(distOutputPath).size;
    console.log(`🎉 构建成功! 最终文件大小: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📦 最终文件位置: dist/index.html`);
    
  } catch (error) {
    console.error('❌ 构建失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main().catch(error => {
  console.error('构建过程出错:', error);
  process.exit(1);
}); 