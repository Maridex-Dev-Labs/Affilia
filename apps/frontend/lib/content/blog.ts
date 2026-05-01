export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'how-to-start-affiliate-marketing-in-kenya',
    title: 'How To Start Affiliate Marketing In Kenya',
    excerpt:
      'A practical path for new affiliates: choosing products, building trust, and getting your first tracked sale without paid ads.',
    category: 'Beginner',
    readTime: '6 min read',
    publishedAt: '2026-04-18',
    sections: [
      {
        heading: 'Start with products you can explain well',
        body: [
          'New affiliates usually fail by promoting too many unrelated products. Start with one niche where you already understand the buyer language, common objections, and price sensitivity.',
          'For the Kenyan market, WhatsApp, status updates, niche Facebook groups, and short TikTok explainers outperform generic hard-sell posts. Your job is not only to share a link. Your job is to reduce buyer hesitation.',
        ],
      },
      {
        heading: 'Use trust assets before the link',
        body: [
          'A buyer converts faster when they see proof, context, and clarity. That means product photos, pricing, who it is for, delivery expectations, and your honest explanation of why it is worth the money.',
          'Treat the affiliate link as the final step, not the first step.',
        ],
      },
      {
        heading: 'Track what actually closes',
        body: [
          'Clicks are useful, but they are not the business. Watch which product angle gets replies, which channel produces conversions, and which merchant products are easiest to explain. Then double down there.',
        ],
      },
    ],
  },
  {
    slug: 'merchant-playbook-for-high-converting-affiliate-products',
    title: 'Merchant Playbook For High-Converting Affiliate Products',
    excerpt:
      'How merchants can make products easier to sell: stronger media, better commission logic, and fewer approval bottlenecks.',
    category: 'Merchant',
    readTime: '5 min read',
    publishedAt: '2026-04-20',
    sections: [
      {
        heading: 'Affiliates sell clarity',
        body: [
          'If your product listing is vague, affiliates cannot market it well. The merchant should provide clean media, exact pricing, stock clarity, and the commission value in simple terms.',
          'The best product listings answer three questions immediately: what is it, who is it for, and why buy now.',
        ],
      },
      {
        heading: 'Commission structure matters',
        body: [
          'A commission should be large enough to justify effort and predictable enough that affiliates know what they are working toward. If the payout is too thin, only low-trust spam tactics remain attractive.',
        ],
      },
      {
        heading: 'Approval speed compounds growth',
        body: [
          'Slow deposit approval, slow order confirmation, and slow moderation all reduce affiliate confidence. Merchants that respond quickly create a tighter loop and attract stronger marketers over time.',
        ],
      },
    ],
  },
  {
    slug: 'building-repeatable-whatsapp-sales-funnels',
    title: 'Building Repeatable WhatsApp Sales Funnels',
    excerpt:
      'A repeatable affiliate workflow for turning status views and DMs into consistent tracked sales.',
    category: 'Growth',
    readTime: '7 min read',
    publishedAt: '2026-04-22',
    sections: [
      {
        heading: 'Structure the funnel',
        body: [
          'A simple WhatsApp funnel has four stages: attention, curiosity, response, and checkout. Status content creates attention, short proof posts create curiosity, direct replies handle objections, and your tracked link closes the sale.',
        ],
      },
      {
        heading: 'Use response scripts carefully',
        body: [
          'Prepared responses help with speed, but they should not feel robotic. Write short reusable answer blocks for pricing, delivery, sizing, payment process, and product fit.',
        ],
      },
      {
        heading: 'Review weekly performance',
        body: [
          'At the end of each week, review which statuses brought replies, which links converted, and which products were ignored. Small weekly adjustments usually outperform large random changes.',
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) || null;
}
