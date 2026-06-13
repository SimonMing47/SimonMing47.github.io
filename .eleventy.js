export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/.nojekyll": ".nojekyll" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });

  const slugifyHeading = (value) => {
    return String(value || "")
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .trim()
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/g, "");
  };

  const normalizePostContent = (content) => {
    return String(content || "").replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, "");
  };

  eleventyConfig.addFilter("readableDate", (date) => {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "2-digit"
    }).format(date);
  });

  eleventyConfig.addFilter("isoDate", (date) => {
    return new Date(date).toISOString();
  });

  eleventyConfig.addFilter("sitemapDate", (date) => {
    return new Date(date).toISOString().slice(0, 10);
  });

  eleventyConfig.addFilter("rfc822Date", (date) => {
    return new Date(date).toUTCString();
  });

  eleventyConfig.addFilter("year", () => {
    return new Date().getFullYear();
  });

  eleventyConfig.addFilter("dateYear", (date) => {
    return new Date(date).getFullYear();
  });

  eleventyConfig.addFilter("monthDay", (date) => {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  });

  eleventyConfig.addFilter("groupByYear", (posts) => {
    const grouped = new Map();
    posts.forEach((post) => {
      const year = new Date(post.date).getFullYear();
      if (!grouped.has(year)) grouped.set(year, []);
      grouped.get(year).push(post);
    });
    return Array.from(grouped, ([year, items]) => ({ year, items }));
  });

  eleventyConfig.addFilter("absoluteUrl", (url, siteUrl) => {
    if (url === "/") return siteUrl;
    return new URL(url.replace(/^\//, ""), siteUrl).toString();
  });

  eleventyConfig.addFilter("jsonify", (value) => {
    return JSON.stringify(value, null, 2);
  });

  eleventyConfig.addFilter("stripLeadingTitle", (content) => {
    return normalizePostContent(content);
  });

  eleventyConfig.addFilter("addHeadingAnchors", (content) => {
    const used = new Map();
    return normalizePostContent(content).replace(/<h([2-3])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, text) => {
      if (/\sid=/.test(attrs)) return match;
      const baseSlug = slugifyHeading(text) || `section-${used.size + 1}`;
      const count = used.get(baseSlug) || 0;
      used.set(baseSlug, count + 1);
      const slug = count ? `${baseSlug}-${count + 1}` : baseSlug;
      return `<h${level}${attrs} id="${slug}">${text}</h${level}>`;
    });
  });

  eleventyConfig.addFilter("toc", (content) => {
    const used = new Map();
    return normalizePostContent(content)
      .match(/<h([2-3])[^>]*>([\s\S]*?)<\/h\1>/gi)
      ?.map((heading) => {
        const [, level, text] = heading.match(/<h([2-3])[^>]*>([\s\S]*?)<\/h\1>/i) || [];
        const label = String(text || "").replace(/<[^>]+>/g, "").trim();
        const baseSlug = slugifyHeading(label) || `section-${used.size + 1}`;
        const count = used.get(baseSlug) || 0;
        used.set(baseSlug, count + 1);
        const slug = count ? `${baseSlug}-${count + 1}` : baseSlug;
        return { level: Number(level), label, slug };
      }) || [];
  });

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/posts/*.md")
      .sort((a, b) => b.date - a.date);
  });

  return {
    pathPrefix: "/",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
