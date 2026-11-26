// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'gpu-pulse',
			sidebar: [
				{ label: 'Architecture', items: [{ autogenerate: { directory: 'architecture' } }] },
				{ label: 'Decisions (ADR)', items: [{ autogenerate: { directory: 'adr' } }] },
				{ label: 'Specs', items: [{ autogenerate: { directory: 'specs' } }] },
				{ label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
			],
		}),
	],
});
