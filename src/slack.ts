import type { Handler } from '@netlify/functions';
import { parse } from 'querystring'
import { blocks, modal, slackApi, verifySlackRequest } from './util/slack';
import { saveItem } from './util/notion';

async function handleSlashCommand(payload: SlackSlashCommandPayload) {
	switch (payload.command) {
		case '/foodfight':
			const response = await slackApi(
				'views.open',
				modal({
					id: 'foodfight', title: 'Start a food fight', trigger_id: payload.trigger_id, blocks: [
						blocks.section({ text: 'The discour demands food drama! *Send in your spiciest food takes so we cal all argue about them and feel alive*' }),
						blocks.input({
							id: 'opinion',
							label: 'Deposit your controversial food opnions here.',
							placeholder: 'Example: peanut butter adn mayonnaise sandwiches are dlicious!',
							initial_value: payload.text ?? '',
							hint: 'What do you believe about food that people find appalling? Say it with your chest!',
						}),
						blocks.select({
							id: 'spice_level',
							label: 'How spicy is this opinion?',
							placeholder: 'Select an spicy level',
							options: [
								{ label: 'mild', value: 'mild' },
								{ label: 'medium', value: 'medium' },
								{ label: 'spicy', value: 'spicy' },
								{ label: 'nuclear', value: 'nuclear' },
							]
						})

					]
				}))
			if (!response.ok) {
				console.log(response)
			}
			break

		default:
			return {
				statusCode: 200,
				body: `Command ${payload.command} is not recognized!!`
			}
	}

	return { statusCode: 200, body: '' }
}

async function handleInteractivity(payload: SlackModalPayload) {
	const callback_id = payload.callback_id ?? payload.view.callback_id
	console.log('callback_id', callback_id)

	switch (callback_id) {
		case 'foodfight':
			const data = payload.view.state.values;
			console.log('data', data)

			const fields = {
				opinion: data.opinion_block.opinion.value,
				spiceLevel: data.spice_level_block.spice_level.selected_option.value,
				submitter: payload.user.name
			}

			await saveItem(fields)

			await slackApi('chat.postMessage', {
				channel: 'C064U0AFRMZ',
				text: `Oh dang, y'all! :eyes: <@${payload.user.id}> just started a food fight with a ${fields.spiceLevel} take: \n\n*${fields.opinion}*\n\n...discuss.`
			})

			break;
		case 'start-food-fight-nudge':
			const channel = payload.channel?.id;
			const user_id = payload.user.id;
			const thread_ts = payload.message.thread_ts ?? payload.message.ts;
			await slackApi('chat.postMessage', {
				channel,
				thread_ts, text: `Hey <@${user_id}>, an opnion like this one deserves a heated public debate. Run the \`foodfight\` slash command in a main channel to start one!`
			})

			break;
		default:
			console.log(`No handler defined for ${callback_id}`)
			return {
				statusCode: 400,
				body: `No handler defined for ${callback_id}`
			}
	}

	return { statusCode: 200, body: '' }
}

export const handler: Handler = async (event) => {
	const valid = verifySlackRequest(event)

	if (!valid) {
		console.error('invalid request')

		return {
			statusCode: 400,
			body: 'invalid request'
		}
	}

	const body = parse(event.body ?? '') as SlackPayload

	if (body.command) {
		return handleSlashCommand(body as SlackSlashCommandPayload)
	}


	if (body.payload) {
		const payload = JSON.parse(body.payload)
		return handleInteractivity(payload)
	}

	return {
		statusCode: 200,
		body: 'TODO: handle Slack commands and interactivity !!',
	};
};
