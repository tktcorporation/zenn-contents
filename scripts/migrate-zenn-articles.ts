#!/usr/bin/env tsx

import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import TurndownService from 'turndown';

// Define schemas for API responses
const TopicSchema = z.union([
  z.string(),
  z.object({
    id: z.number(),
    name: z.string(),
    display_name: z.string().optional(),
    taggings_count: z.number().optional(),
    image_url: z.string().nullable().optional()
  })
]);

const ArticleMetadataSchema = z.object({
  id: z.number(),
  post_type: z.literal('Article'),
  title: z.string(),
  slug: z.string(),
  comments_count: z.number(),
  liked_count: z.number(),
  bookmarked_count: z.number().optional(),
  body_letters_count: z.number(),
  article_type: z.enum(['tech', 'idea']),
  emoji: z.string(),
  is_suspending_private: z.boolean(),
  published_at: z.string().nullable(),
  body_updated_at: z.string().nullable().optional(),
  source_repo_updated_at: z.string().nullable().optional(),
  pinned: z.boolean().optional(),
  path: z.string().optional(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    name: z.string(),
    avatar_small_url: z.string()
  }).optional(),
  publication: z.any().nullable().optional(),
  topics: z.array(TopicSchema).optional()
});

const ArticleContentSchema = ArticleMetadataSchema.extend({
  body_markdown: z.string().optional(),
  body: z.string().optional(),
  body_html: z.string().optional(),
  body_html_preview: z.string().optional(),
  body_html_raw: z.string().optional(),
  topics: z.array(TopicSchema).optional().default([])
});

const ArticleListResponseSchema = z.object({
  articles: z.array(ArticleMetadataSchema),
  next_page: z.number().nullable().optional()
});

const ArticleDetailResponseSchema = z.object({
  article: ArticleContentSchema
});

interface Article {
  slug: string;
  title: string;
  emoji: string;
  type: 'tech' | 'idea';
  topics: string[];
  published: boolean;
  content: string;
}

// Add custom headers to mimic a browser request
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

// Initialize Turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  fence: '```',
  bulletListMarker: '-'
});

// Remove header anchor links since Zenn generates them automatically
turndownService.addRule('removeHeaderAnchors', {
  filter: (node) => {
    return node.nodeName === 'A' && 
           node.getAttribute('class')?.includes('header-anchor-link');
  },
  replacement: () => ''
});

// Clean up heading text to remove anchor IDs
turndownService.addRule('cleanHeadings', {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: (content, node, options) => {
    const level = parseInt(node.nodeName.charAt(1));
    const prefix = '#'.repeat(level);
    // Remove [](#anchor-id) pattern from heading text
    const cleanContent = content.replace(/\[\]\(#[^)]+\)/g, '').trim();
    return `\n\n${prefix} ${cleanContent}\n\n`;
  }
});

// Custom rules for Zenn-specific elements
turndownService.addRule('zennEmbedded', {
  filter: (node) => {
    return node.nodeName === 'SPAN' && 
           node.getAttribute('class')?.includes('zenn-embedded');
  },
  replacement: (content, node) => {
    const iframe = (node as any).querySelector('iframe');
    if (iframe) {
      const dataContent = iframe.getAttribute('data-content');
      if (dataContent) {
        const decodedUrl = decodeURIComponent(dataContent);
        return `\n\n${decodedUrl}\n\n`;
      }
    }
    return '';
  }
});

async function fetchArticleList(username: string): Promise<string[]> {
  console.log(`Fetching article list for ${username}...`);
  
  try {
    const response = await fetch(`https://zenn.dev/api/articles?username=${username}&order=latest`, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch articles: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate the response with Zod
    try {
      const validatedData = ArticleListResponseSchema.parse(data);
      console.log(`  → Found ${validatedData.articles.length} articles via API`);
      return validatedData.articles.map(article => article.slug);
    } catch (zodError) {
      console.error('  → API response validation failed:', zodError);
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error fetching article list:', error);
    // Fallback: try to parse from HTML
    console.log('  → Falling back to HTML parsing...');
    const htmlResponse = await fetch(`https://zenn.dev/${username}`, { headers });
    const html = await htmlResponse.text();
    
    // Extract article slugs from HTML
    const slugPattern = /href="\/[^\/]+\/articles\/([a-z0-9]+)"/g;
    const slugs: string[] = [];
    let match: RegExpExecArray | null;
    
    while ((match = slugPattern.exec(html)) !== null) {
      if (!slugs.includes(match[1])) {
        slugs.push(match[1]);
      }
    }
    
    console.log(`  → Found ${slugs.length} articles via HTML parsing`);
    return slugs;
  }
}

async function fetchArticleContent(username: string, slug: string): Promise<Article | null> {
  console.log(`Fetching article: ${slug}...`);
  
  try {
    // Try API endpoint first
    const apiUrl = `https://zenn.dev/api/articles/${slug}`;
    console.log(`  → Trying API: ${apiUrl}`);
    
    const apiResponse = await fetch(apiUrl, { headers });
    console.log(`  → API Response Status: ${apiResponse.status} ${apiResponse.statusText}`);
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.log(`  → API Error Response: ${errorText.substring(0, 200)}...`);
      
      if (apiResponse.status === 404) {
        console.log(`  → Article not found via API`);
      } else if (apiResponse.status === 403) {
        console.log(`  → Access forbidden - API might be protected`);
      } else if (apiResponse.status === 429) {
        console.log(`  → Rate limited - too many requests`);
      }
    } else {
      const responseData = await apiResponse.json();
      
      // Validate the response
      let validatedData: z.infer<typeof ArticleContentSchema>;
      try {
        const parsed = ArticleDetailResponseSchema.parse(responseData);
        validatedData = parsed.article;
      } catch (zodError) {
        console.log(`  → API response validation failed. Trying alternative schema...`);
        // Try parsing as direct article content
        try {
          validatedData = ArticleContentSchema.parse(responseData);
        } catch (zodError2) {
          console.log(`  → Both schema validations failed`);
          console.log(`  → Response structure: ${JSON.stringify(Object.keys(responseData))}`);
          if (responseData.article) {
            console.log(`  → Article fields: ${JSON.stringify(Object.keys(responseData.article))}`);
          }
          throw new Error('Invalid API response structure');
        }
      }
      
      console.log(`  → API Success: Retrieved article "${validatedData.title}"`);
      
      // Check if we have the actual article content
      let content = '';
      if (validatedData.body_markdown) {
        console.log(`  → Found body_markdown - using as-is`);
        content = validatedData.body_markdown;
      } else if (validatedData.body_html) {
        console.log(`  → Found body_html - converting to Markdown`);
        // Convert HTML to Markdown
        content = turndownService.turndown(validatedData.body_html);
      } else if (validatedData.body) {
        console.log(`  → Found body field`);
        content = validatedData.body;
      } else {
        console.log(`  → Warning: No body content found. Checking for metadata only...`);
        console.log(`  → Article has ${validatedData.body_letters_count} characters but content not accessible`);
        console.log(`  → Available fields: ${Object.keys(validatedData).join(', ')}`);
        
        // Store metadata for reference
        const metadataFilename = `${slug}_metadata.json`;
        const metadataPath = path.join(process.cwd(), 'articles', metadataFilename);
        await fs.writeFile(metadataPath, JSON.stringify({
          slug: validatedData.slug,
          title: validatedData.title,
          emoji: validatedData.emoji,
          type: validatedData.article_type,
          topics: validatedData.topics?.map((t: string | { name: string }) => typeof t === 'string' ? t : t.name) || [],
          published_at: validatedData.published_at,
          liked_count: validatedData.liked_count,
          comments_count: validatedData.comments_count,
          body_letters_count: validatedData.body_letters_count
        }, null, 2), 'utf-8');
        console.log(`  → Saved metadata to ${metadataFilename}`);
        
        return null;
      }
      
      // Extract topics from the validated structure
      const topics = validatedData.topics || [];
      const topicNames = topics.map((t: string | { name: string }) => typeof t === 'string' ? t : t.name);
      
      return {
        slug: validatedData.slug,
        title: validatedData.title,
        emoji: validatedData.emoji,
        type: validatedData.article_type,
        topics: topicNames,
        published: validatedData.published_at !== null,
        content
      };
    }
  } catch (error) {
    console.log(`  → API fetch error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Fallback to HTML parsing
  console.log(`  → Trying HTML fallback...`);
  try {
    const htmlUrl = `https://zenn.dev/${username}/articles/${slug}`;
    console.log(`  → Fetching HTML: ${htmlUrl}`);
    
    const response = await fetch(htmlUrl, { headers });
    console.log(`  → HTML Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.log(`  → HTML fetch failed: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch article ${slug}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Extract article data from HTML
    // Look for the article content in script tags
    const scriptMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (scriptMatch) {
      try {
        const jsonData = JSON.parse(scriptMatch[1]);
        const article = jsonData.props?.pageProps?.article;
        
        if (article) {
          return {
            slug: article.slug || slug,
            title: article.title || '',
            emoji: article.emoji || '📝',
            type: article.article_type || 'tech',
            topics: article.topics?.map((t: any) => t.name || t) || [],
            published: article.published || false,
            content: article.body_markdown || ''
          };
        }
      } catch (e) {
        console.error('Failed to parse JSON data:', e);
      }
    }
    
    // Try to extract content from HTML elements
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const title = titleMatch ? titleMatch[1] : '';
    
    // Extract markdown content if available
    const contentMatch = html.match(/<div class="znc">[\s\S]*?<\/div>/);
    let content = '';
    if (contentMatch) {
      // This is a simplified extraction - actual implementation would need proper HTML to Markdown conversion
      content = `# ${title}\n\n[Content needs manual extraction from Zenn]`;
    }
    
    return {
      slug,
      title,
      emoji: '📝',
      type: 'tech',
      topics: [],
      published: true,
      content
    };
    
  } catch (error) {
    console.log(`  → HTML parsing error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function saveArticle(article: Article): Promise<void> {
  const filename = `${article.slug}.md`;
  const filepath = path.join(process.cwd(), 'articles', filename);
  
  // Create front matter
  const frontMatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
emoji: "${article.emoji}"
type: "${article.type}"
topics: [${article.topics.map(t => `"${t}"`).join(', ')}]
published: ${article.published}
---

`;
  
  const fullContent = frontMatter + article.content;
  
  await fs.writeFile(filepath, fullContent, 'utf-8');
  console.log(`✅ Saved: ${filename}`);
}

async function main() {
  const username = process.argv[2] || 'tktcorporation';
  
  console.log(`🚀 Starting migration for user: ${username}`);
  console.log('================================\n');
  
  // Ensure articles directory exists
  const articlesDir = path.join(process.cwd(), 'articles');
  await fs.mkdir(articlesDir, { recursive: true });
  
  try {
    // Fetch article list
    const slugs = await fetchArticleList(username);
    console.log(`\nFound ${slugs.length} articles\n`);
    
    // Process each article
    let successCount = 0;
    let failCount = 0;
    
    for (const slug of slugs) {
      const article = await fetchArticleContent(username, slug);
      
      if (article && article.content) {
        await saveArticle(article);
        successCount++;
      } else {
        console.log(`❌ Failed to fetch: ${slug}`);
        failCount++;
      }
      
      // Add delay to avoid rate limiting
      console.log('  → Waiting 2 seconds before next request...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n================================');
    console.log(`✅ Migration completed!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log('\nNote: Due to Zenn\'s protection, some articles may need manual migration.');
    console.log('Please check the Zenn dashboard and manually export any missing articles.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);