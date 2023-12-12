import { type Handler, schedule } from '@netlify/functions'
import { getNewItems } from './util/notion';
import { blocks, slackApi } from './util/slack';

const postnewNotionItemsToSlack: Handler = async () => {
  console.log(' postnewNotionItemsToSlack')
  const items = await getNewItems()
  console.log('items', items)
  await slackApi('chat.postMessage', {
    channel: 'C064U0AFRMZ',
    blocks: [
      blocks.section({
        text: [
          'Here are the opinions awaiting judgement:',
          '',
          ...items.map((item) => `- ${item.opinion} (spice level: ${item.spiceLevel})`),
          '',
          `See all itmes: <https://notion.com/${process.env.NOTION_DATABASE_ID}|in Notion>`
        ].join('\n')
      })
    ]
  })
  return {
    statusCode: 200,
  }
}

// export const handler = schedule('0 9 * * 1', postnewNotionItemsToSlack)
export const handler = schedule('* * * * *', postnewNotionItemsToSlack)