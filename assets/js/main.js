const accentTag = new URLSearchParams(window.location.search).get('tag') || 'all';
let searchQuery = '';

async function fetchPosts() {
  const response = await fetch('data/posts.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('无法读取文章索引');
  }
  return response.json();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(date);
}

function createTags(tags = []) {
  return tags
    .map(
      (tag) => `<span class="tag" aria-label="标签：${tag}">${tag}</span>`,
    )
    .join('');
}

function createPostCard(post) {
  return `
    <article class="post-card">
      <p class="meta">${formatDate(post.date)} · ${post.readTime} · ${post.lang}</p>
      <h3>${post.title}</h3>
      <p>${post.excerpt}</p>
      <div class="tag-row" aria-label="文章标签">${createTags(post.tags)}</div>
      <a class="btn-primary" href="post.html?slug=${post.slug}" style="margin-top:14px;display:inline-flex">阅读全文 →</a>
    </article>
  `;
}

function initTheme() {
  const saved = localStorage.getItem('codemint-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;

  const toggle = document.querySelector('#theme-toggle');
  if (!toggle) return;

  toggle.textContent = theme === 'dark' ? '☼' : '◐';
  toggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('codemint-theme', next);
    toggle.textContent = next === 'dark' ? '☼' : '◐';
  });
}

function renderTagFilters(posts) {
  const target = document.querySelector('#tag-filter');
  if (!target) return;

  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags || [])));
  const list = ['全部', ...allTags];

  target.innerHTML = '';

  list.forEach((tag) => {
    const isAll = tag === '全部';
    const button = document.createElement('button');
    button.className = 'tag-btn';
    button.type = 'button';
    button.dataset.tag = isAll ? 'all' : tag;
    button.textContent = tag;
    if ((isAll && accentTag === 'all') || (!isAll && accentTag === tag)) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      const selected = button.dataset.tag;
      const url = new URL(window.location);
      if (selected === 'all') {
        url.searchParams.delete('tag');
      } else {
        url.searchParams.set('tag', selected);
      }
      window.location.href = url.pathname + url.search;
    });

    target.appendChild(button);
  });
}

function renderPosts(posts) {
  const list = document.querySelector('#post-list');
  if (!list) return;

  const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const filtered =
    accentTag === 'all'
      ? sorted
      : sorted.filter((post) => (post.tags || []).includes(accentTag));
  const searched = searchQuery
    ? filtered.filter((post) =>
        [post.title, post.excerpt, ...(post.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(searchQuery),
      )
    : filtered;

  renderTagFilters(posts);

  if (!searched.length) {
    list.innerHTML = `<div class="section-card"><p>暂无匹配的文章。</p></div>`;
    return;
  }

  list.innerHTML = searched.map(createPostCard).join('');
}

async function loadPostsForIndex() {
  try {
    const posts = await fetchPosts();
    const searchInput = document.querySelector('#post-search');
    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        searchQuery = event.target.value.trim().toLowerCase();
        renderPosts(posts);
      });
    }
    renderPosts(posts);
  } catch (error) {
    const list = document.querySelector('#post-list');
    if (list) {
      list.innerHTML = `<div class="section-card"><p>读取文章索引失败：${error.message}</p></div>`;
    }
  }
}

function markdownToHtml(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  let i = 0;
  let html = '';

  const parseInline = (line) =>
    escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const language = line.replace('```', '').trim();
      i += 1;
      const codeLines = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(escapeHtml(lines[i]));
        i += 1;
      }
      i += 1;
      html += `<pre><code class="lang-${language}">${codeLines.join('\n')}</code></pre>`;
      continue;
    }

    if (/^###\s/.test(line)) {
      html += `<h4>${escapeHtml(line.replace('###', '').trim())}</h4>`;
      i += 1;
      continue;
    }

    if (/^##\s/.test(line)) {
      html += `<h3>${escapeHtml(line.replace('##', '').trim())}</h3>`;
      i += 1;
      continue;
    }

    if (/^#\s/.test(line)) {
      html += `<h2>${escapeHtml(line.replace('#', '').trim())}</h2>`;
      i += 1;
      continue;
    }

    if (/^>\s/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      html += `<blockquote>${parseInline(quote.join(' '))}</blockquote>`;
      continue;
    }

    if (/^-\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s/.test(lines[i])) {
        items.push(`<li>${parseInline(lines[i].replace('- ', '').trim())}</li>`);
        i += 1;
      }
      html += `<ul>${items.join('')}</ul>`;
      continue;
    }

    if (/^\*\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\*\s/.test(lines[i])) {
        items.push(`<li>${parseInline(lines[i].replace('* ', '').trim())}</li>`);
        i += 1;
      }
      html += `<ul>${items.join('')}</ul>`;
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const paragraph = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() !== '') {
      if (/^(#|>|-|\*|```)/.test(lines[i])) break;
      paragraph.push(lines[i]);
      i += 1;
    }

    html += `<p>${parseInline(paragraph.join(' ').trim())}</p>`;
  }

  return html;
}

async function loadPostBySlug(slug) {
  const titleEl = document.querySelector('#post-title');
  const metaEl = document.querySelector('#post-meta');
  const tagsEl = document.querySelector('#post-tags');
  const contentEl = document.querySelector('#post-content');
  const related = document.querySelector('#related');

  if (!titleEl || !metaEl || !contentEl) return;

  if (!slug) {
    metaEl.textContent = '未找到文章参数';
    contentEl.innerHTML = `<p>请从首页点击文章进入。</p>`;
    return;
  }

  try {
    const posts = await fetchPosts();
    const post = posts.find((item) => item.slug === slug);

    if (!post) {
      metaEl.textContent = '文章不存在';
      contentEl.innerHTML = `<p>找不到这篇文章，请返回首页重试。</p>`;
      return;
    }

    document.title = `${post.title} | CodeMint`;
    titleEl.textContent = post.title;
    metaEl.textContent = `${formatDate(post.date)} · ${post.readTime} · ${post.lang}`;
    tagsEl.innerHTML = createTags(post.tags);

    const response = await fetch(`posts/${slug}.md`, { cache: 'no-store' });
    if (!response.ok) throw new Error('正文文件读取失败');
    const markdown = await response.text();
    contentEl.innerHTML = markdownToHtml(markdown);

    const others = posts
      .filter((item) => item.slug !== slug)
      .slice(0, 3)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (related && others.length) {
      related.innerHTML = `<h3>更多文章</h3><div class="post-grid">${others
        .map((item) => createPostCard(item))
        .join('')}</div>`;
    }
  } catch (error) {
    metaEl.textContent = '加载失败';
    contentEl.innerHTML = `<p>${error.message}</p>`;
  }
}

function initFromCurrentPage() {
  initTheme();
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.endsWith('post.html') || pathname.endsWith('.html') && pathname.includes('post')) {
    return;
  }
  document.addEventListener('DOMContentLoaded', loadPostsForIndex);
}

initFromCurrentPage();
