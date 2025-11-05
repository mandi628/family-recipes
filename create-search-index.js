const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const contentDir = path.join(__dirname, 'src/content/recipes');
const outputDir = path.join(__dirname, 'public');
const outputFile = path.join(outputDir, 'search-index.json');

function generateSearchIndex() {
    try {
        const files = fs.readdirSync(contentDir);
        const searchIndex = [];

        files.forEach(file => {
            if (path.extname(file) === '.md') {
                const filePath = path.join(contentDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const { data, content } = matter(fileContent); // Use gray-matter to parse frontmatter

                searchIndex.push({
                    slug: file.replace(/\.md$/, ''),
                    title: data.title,
                    tags: data.tags || [],
                    content: content
                });
            }
        });

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        fs.writeFileSync(outputFile, JSON.stringify(searchIndex, null, 2));
        console.log(`Search index generated successfully at ${outputFile}`);
    } catch (error) {
        console.error('Error generating search index:', error);
    }
}

generateSearchIndex();