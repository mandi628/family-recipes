const fs = require('fs');
const path = require('path');

const inputFile = 'recipes.json'; // The file you exported from TiddlyWiki
const recipesOutputDir = 'src/content/recipes'; // Where to save recipe markdown files
const updatesOutputDir = 'src/content/updates'; // Where to save update markdown files
const menusOutputDir = 'src/content/menus'; // Where to save menu markdown files
const pagesOutputDir = 'src/pages'; // Where to save static .astro pages

// --- TiddlyWiki to Markdown Conversion Logic ---
function convertTiddlyWikiToMarkdown(tiddlyText) {
    if (!tiddlyText) return '';
    let markdown = tiddlyText;
    // Convert headings: ! -> #, !! -> ##, etc.
    markdown = markdown.replace(/^!{1,6}\s/gm, (match) => '#'.repeat(match.length - 1) + ' ');
    // Convert bold: ''text'' -> **text**
    markdown = markdown.replace(/''([^']+)''/g, '**$1**');
    // Convert italics: //text// -> *text*
    markdown = markdown.replace(/\/\/([^\/]+)\/\//g, '*$1*');
    // Convert links: [[Text|Link]] -> [Text](Link) and [[Link]] -> [Link](Link)
    markdown = markdown.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '[$1]($2.html)');
    markdown = markdown.replace(/\[\[([^\]]+)\]\]/g, '[$1]($1.html)');
    // Convert <br> to markdown line breaks
    markdown = markdown.replace(/<br>/g, '  \n');
    return markdown;
}

// --- Main Script ---
try {
    // Create output directories if they don't exist
    if (!fs.existsSync(recipesOutputDir)) {
        fs.mkdirSync(recipesOutputDir, { recursive: true });
    }
    if (!fs.existsSync(updatesOutputDir)) {
        fs.mkdirSync(updatesOutputDir, { recursive: true });
    }
    if (!fs.existsSync(menusOutputDir)) {
        fs.mkdirSync(menusOutputDir, { recursive: true });
    }
    if (!fs.existsSync(pagesOutputDir)) {
        fs.mkdirSync(pagesOutputDir, { recursive: true });
    }

    // Read the JSON file
    const tiddlersData = fs.readFileSync(inputFile, 'utf-8');
    const tiddlers = JSON.parse(tiddlersData);

    let recipeCount = 0;
    let updateCount = 0;
    let menuCount = 0;
    let staticPageCount = 0;
    let categoryPageCount = 0;
    const staticPages = ["Sources", "To Do"];

    tiddlers.forEach(tiddler => {
        // We'll skip system tiddlers
        if (tiddler.title && !tiddler.title.startsWith('$:/')) {
            const markdownContent = convertTiddlyWikiToMarkdown(tiddler.text);
            const tags = tiddler.tags ? tiddler.tags.split(' ') : [];
            if (staticPages.includes(tiddler.title)) {
                const astroContent = `---
import Layout from '../layouts/Layout.astro';
---
<Layout title="${tiddler.title.replace(/"/g, '\\"')}"><h2>${tiddler.title}</h2><div>${markdownContent.replace(/`/g, '\\`')}</div></Layout>`;
                const filename = tiddler.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.astro';
                const outputPath = path.join(pagesOutputDir, filename);
                fs.writeFileSync(outputPath, astroContent, 'utf-8');
                staticPageCount++;
                return; // Skip normal processing for this tiddler
            }

            // Handle category pages that just list other tiddlers
            if (tiddler.text && tiddler.text.includes('<<list-links')) {
                const tagMatch = tiddler.text.match(/\[tag\[([^\]]+)\]\]/);
                const tag = tagMatch ? tagMatch[1] : tiddler.title;
                const astroContent = `---
import { getCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';

const recipes = await getCollection('recipes', ({ data }) => data.tags?.includes("${tag}"));
recipes.sort((a, b) => a.data.title.localeCompare(b.data.title));
---
<Layout title={"${tiddler.title}"}>
    <h2>${tiddler.title}</h2>
    <ul>{recipes.map(recipe => <li><a href={\`/recipes/\${recipe.slug}/\`}>{recipe.data.title}</a></li>)}</ul>
</Layout>`;
                const filename = tiddler.title.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-') + '.astro';
                const outputPath = path.join(pagesOutputDir, filename);
                fs.writeFileSync(outputPath, astroContent, 'utf-8');
                categoryPageCount++;
                return; // Skip normal processing for this tiddler
            }

            // Special handling for "Main Dishes" which has a manual list
            if (tiddler.title === "Main Dishes") {
                const tag = "Main Dishes";
                const astroContent = `---
import { getCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';

const recipes = await getCollection('recipes', ({ data }) => data.tags?.includes("${tag}"));
recipes.sort((a, b) => a.data.title.localeCompare(b.data.title));
---
<Layout title={"${tiddler.title}"}>
    <h2>${tiddler.title}</h2>
    <ul>{recipes.map(recipe => <li><a href={\`/recipes/\${recipe.slug}/\`}>{recipe.data.title}</a></li>)}</ul>
</Layout>`;
                const filename = tiddler.title.toLowerCase().replace(/\s+/g, '-') + '.astro';
                const outputPath = path.join(pagesOutputDir, filename);
                fs.writeFileSync(outputPath, astroContent, 'utf-8');
                categoryPageCount++;
                return;
            }

            // Handle the "Notes" tiddler as a special static page because it contains TiddlyWiki syntax
            if (tiddler.title === "Notes") {
                const astroContent = `---
import Layout from '../layouts/Layout.astro';
---
<Layout title="${tiddler.title.replace(/"/g, '\\"')}"><h2>${tiddler.title}</h2><div>${markdownContent.replace(/`/g, '\\`')}</div></Layout>`;
                const filename = tiddler.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.astro';
                const outputPath = path.join(pagesOutputDir, filename);
                fs.writeFileSync(outputPath, astroContent, 'utf-8');
                staticPageCount++;
                return;
            }

            // Handle Menus separately to extract recipes
            if (tags.includes('Menu')) {
                const recipeLinks = (tiddler.text.match(/\[\[(.*?)\]\]/g) || [])
                    .map(link => link.substring(2, link.length - 2)) // Extract title from [[Title]]
                    .map(title => title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')); // Slugify

                const menuFrontmatter = `---
title: "${tiddler.title.replace(/"/g, '\\"')}"
recipes: ${JSON.stringify(recipeLinks)}
---

${markdownContent}`;
                const filename = tiddler.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.md';
                const outputPath = path.join(menusOutputDir, filename);
                fs.writeFileSync(outputPath, menuFrontmatter, 'utf-8');
                menuCount++;
            } else {
                // Create frontmatter for other tiddlers (recipes, updates)
                const frontmatter = `---
title: "${tiddler.title.replace(/"/g, '\\"')}"
tags: ${JSON.stringify(tags)}
created: "${tiddler.created}"
modified: "${tiddler.modified}"
---

${markdownContent}`;
                // Create a URL-friendly filename
                const filename = tiddler.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.md';
                
                // Decide output directory based on tags
                let outputPath;
                if (tags.includes('Journal')) {
                    outputPath = path.join(updatesOutputDir, filename);
                    updateCount++;
                } else {
                    outputPath = path.join(recipesOutputDir, filename);
                    recipeCount++;
                }

                fs.writeFileSync(outputPath, frontmatter, 'utf-8');
            }
        }
        });

        console.log(`Successfully converted ${recipeCount} recipes, ${updateCount} updates, ${menuCount} menus, ${staticPageCount} static pages, and ${categoryPageCount} category pages!`);

    } catch (error) {
        console.error('An error occurred:', error.message);
    }
