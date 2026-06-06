import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const models = {
  chat: 'gpt-4o-mini',
  embedding: 'text-embedding-3-small',
};

export const knowledgeBases = {
  products: 'agrimarche_products',
  orders: 'agrimarche_orders',
};