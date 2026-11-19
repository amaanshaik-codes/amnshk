const { markdownToHtml, inlineMarkdown } = require('./build.js');
const check = (name, md, expected) => {
  const out = markdownToHtml(md, '');
  const pass = expected instanceof RegExp ? expected.test(out) : out.includes(expected);
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + name);
  if (!pass) console.log('   got: ' + out.slice(0, 300));
};

console.log('--- 1. text formatting');
check('bold', '**Text**', '<strong>Text</strong>');
check('italic', '*Text*', '<em>Text</em>');
check('bold+italic', '***Text***', '<strong><em>Text</em></strong>');
check('strike', '~~Text~~', '<del>Text</del>');
check('inline code', '`Text`', '<code>Text</code>');
check('highlight', '==Text==', '<mark>Text</mark>');
check('underline', '<u>Text</u>', '<u>Text</u>');
check('italic in word no', 'snake_case_name', /snake_case_name/);

console.log('--- 2. headings');
[1,2,3,4,5,6].forEach((n) => check('h'+n, '#'.repeat(n)+' Heading', '<h'+n+'>Heading</h'+n+'>'));

console.log('--- 3. lists');
check('bullet -', '- Item', '<ul><li>Item</li></ul>');
check('bullet *', '* Item', '<ul><li>Item</li></ul>');
check('ordered', '1. Item\n2. Two', '<ol><li>Item</li><li>Two</li></ol>');
check('nested', '- Item\n  - Sub-item', /<ul><li>Item<ul><li>Sub-item<\/li><\/ul><\/li><\/ul>/);
check('task open', '- [ ] Task', /<li class="task"><input type="checkbox" disabled> Task/);
check('task done', '- [x] Task', /checked/);

console.log('--- 4. quotes/separators');
check('blockquote', '> Text', '<blockquote>Text</blockquote>');
check('nested quote', '>> Text', 'quote-2');
check('hr ---', '---', '<hr>');
check('hr ***', '***', '<hr>');
check('hr ___', '___', '<hr>');

console.log('--- 5. links/images');
check('link', '[Google](https://google.com)', 'https://google.com');
check('external new tab', '[Google](https://google.com)', 'target="_blank"');
check('internal no new tab', '[x](/page.html)', /<a href="\/page.html">x<\/a>/);
check('image', '![Description](pic.png)', '<img src="pic.png" alt="Description"');
check('email', '[Email](mailto:test@example.com)', 'mailto:test@example.com');

console.log('--- 6. code');
check('multiline', '```python\nprint("Hello World")\n```', 'language-python');
check('js block', '```javascript\nconsole.log("Hello");\n```', 'console.log(&quot;Hello&quot;)');
check('inline in code not parsed', '`**not bold**`', '<code>**not bold**</code>');

console.log('--- 7/8. tables');
check('table', '| Name | Age |\n|---|---|\n| John | 25 |', /<th>Name<\/th><th>Age<\/th>/);
check('table aligns', '| L | C | R |\n|:---|:---:|---:|\n| A | B | C |', /class="ta-center"/);

console.log('--- 9. math');
check('inline math', 'E is $E=mc^2$ here', /<span class="math">E=mc<sup>2<\/sup><\/span>/);
check('block math', '$$E=mc^2$$', /<span class="math-block">E=mc<sup>2<\/sup><\/span>/);

console.log('--- 10. escaping');
check('escaped *', '\\*not italic\\*', '*not italic*');
check('escaped #', '\\# not heading', /<p># not heading<\/p>/);
check('escaped backtick', '\\`\\`\\`', '```');

console.log('--- alignment markers');
check('justify', '<justify>\nSome text here.\n</justify>', /class="align-justify"/);

console.log('--- safety');
check('script escaped', '<script>alert(1)</script>', /&lt;script&gt;/);
