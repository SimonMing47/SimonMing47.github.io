export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/.nojekyll": ".nojekyll" });

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

  eleventyConfig.addFilter("absoluteUrl", (url, siteUrl) => {
    if (url === "/") return siteUrl;
    return new URL(url.replace(/^\//, ""), siteUrl).toString();
  });

  eleventyConfig.addFilter("jsonify", (value) => {
    return JSON.stringify(value, null, 2);
  });

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/posts/*.md")
      .sort((a, b) => b.date - a.date);
  });

  return {
    pathPrefix: "/codemint-blog/",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
