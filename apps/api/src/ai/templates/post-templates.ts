export const POST_TEMPLATES = {
  // Product Launch
  productLaunch: {
    name: 'Product Launch',
    template: `🚀 Excited to announce {{productName}}!

{{description}}

Key features:
{{features}}

Get started today: {{link}}

{{hashtags}}`,
    variables: ['productName', 'description', 'features', 'link', 'hashtags'],
  },

  // Event Promotion
  eventPromotion: {
    name: 'Event Promotion',
    template: `📅 Join us for {{eventName}}!

📍 Location: {{location}}
🗓️ Date: {{date}}
⏰ Time: {{time}}

{{description}}

Register now: {{registrationLink}}

{{hashtags}}`,
    variables: ['eventName', 'location', 'date', 'time', 'description', 'registrationLink', 'hashtags'],
  },

  // Special Offer
  specialOffer: {
    name: 'Special Offer',
    template: `💥 SPECIAL OFFER ALERT!

Get {{discount}}% OFF on {{productName}}!

{{description}}

Valid until: {{expiryDate}}
Use code: {{couponCode}}

Shop now: {{link}}

{{hashtags}}`,
    variables: ['discount', 'productName', 'description', 'expiryDate', 'couponCode', 'link', 'hashtags'],
  },

  // Customer Testimonial
  testimonial: {
    name: 'Customer Testimonial',
    template: `⭐ What our customers are saying:

"{{testimonial}}"

- {{customerName}}, {{customerTitle}}

{{callToAction}}

{{hashtags}}`,
    variables: ['testimonial', 'customerName', 'customerTitle', 'callToAction', 'hashtags'],
  },

  // Behind the Scenes
  behindScenes: {
    name: 'Behind the Scenes',
    template: `👀 Behind the scenes at {{companyName}}!

{{description}}

{{funFact}}

Want to join the team? {{careerLink}}

{{hashtags}}`,
    variables: ['companyName', 'description', 'funFact', 'careerLink', 'hashtags'],
  },

  // Tips & Tricks
  tipsTricks: {
    name: 'Tips & Tricks',
    template: `💡 Pro Tip: {{tipTitle}}

{{tipDescription}}

Try it today and let us know how it works for you!

{{hashtags}}`,
    variables: ['tipTitle', 'tipDescription', 'hashtags'],
  },

  // Weekly Roundup
  weeklyRoundup: {
    name: 'Weekly Roundup',
    template: `📊 This week at {{companyName}}:

{{highlight1}}
{{highlight2}}
{{highlight3}}

What's your favorite? Comment below! 👇

{{hashtags}}`,
    variables: ['companyName', 'highlight1', 'highlight2', 'highlight3', 'hashtags'],
  },

  // Question/Poll
  question: {
    name: 'Engagement Question',
    template: `❓ We want to hear from you!

{{question}}

{{option1}}
{{option2}}
{{option3}}

Drop your answer in the comments! 👇

{{hashtags}}`,
    variables: ['question', 'option1', 'option2', 'option3', 'hashtags'],
  },

  // Milestone Celebration
  milestone: {
    name: 'Milestone Celebration',
    template: `🎉 We hit {{milestone}}!

Thank you to our amazing community for helping us reach this incredible milestone!

{{message}}

Here's to the next {{nextMilestone}}! 🚀

{{hashtags}}`,
    variables: ['milestone', 'message', 'nextMilestone', 'hashtags'],
  },

  // Blog Post Promo
  blogPromo: {
    name: 'Blog Post Promotion',
    template: `📝 New blog post alert!

{{title}}

{{summary}}

Read the full article: {{link}}

{{hashtags}}`,
    variables: ['title', 'summary', 'link', 'hashtags'],
  },
};

export const PLATFORM_BEST_PRACTICES = {
  facebook: {
    maxLength: 63206,
    optimalLength: 40,
    hashtagLimit: 10,
    emojiUsage: 'moderate',
    tips: [
      'Ask questions to increase engagement',
      'Use video content for higher reach',
      'Post between 1-4 PM for best engagement',
      'Use Facebook Stories for time-sensitive content',
    ],
  },
  instagram: {
    maxLength: 2200,
    optimalLength: 138,
    hashtagLimit: 30,
    emojiUsage: 'high',
    tips: [
      'Use all 30 hashtags for maximum reach',
      'Post high-quality images (1080x1080 or 1080x1350)',
      'Best posting times: 11 AM - 1 PM',
      'Use Instagram Stories and Reels for engagement',
      'Include location tags when relevant',
    ],
  },
  twitter: {
    maxLength: 280,
    optimalLength: 71,
    hashtagLimit: 3,
    emojiUsage: 'moderate',
    tips: [
      'Keep it concise - tweets under 100 chars get 17% more engagement',
      'Use 1-2 hashtags maximum',
      'Ask questions or use call-to-actions',
      'Best posting times: 8-10 AM and 6-9 PM',
      'Use threads for longer content',
    ],
  },
  linkedin: {
    maxLength: 3000,
    optimalLength: 150,
    hashtagLimit: 5,
    emojiUsage: 'low',
    tips: [
      'Start with a hook in the first line',
      'Use line breaks for readability',
      'Add value - share insights or lessons learned',
      'Best posting times: Tuesday-Thursday 10 AM - 12 PM',
      'Use professional tone',
    ],
  },
  tiktok: {
    maxLength: 2200,
    optimalLength: 100,
    hashtagLimit: 6,
    emojiUsage: 'high',
    tips: [
      'Make it catchy and attention-grabbing',
      'Use trending sounds and hashtags',
      'Keep videos short (15-30 seconds)',
      'Post 1-4 times per day',
      'Engage with comments quickly',
    ],
  },
};

export function getTemplateByName(name: string) {
  return Object.values(POST_TEMPLATES).find(t => t.name === name);
}

export function listTemplates() {
  return Object.entries(POST_TEMPLATES).map(([key, template]) => ({
    key,
    name: template.name,
    variables: template.variables,
  }));
}
