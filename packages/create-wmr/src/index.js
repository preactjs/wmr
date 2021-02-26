#!/usr/bin/env node

import { resolve, relative } from 'path';
import { promises as fs } from 'fs';
import sade from 'sade';
import ora from 'ora';
import kleur from 'kleur';
import pkgInstall from 'pkg-install';
const { getPackageManager, install } = pkgInstall;
const { dim, bold, cyan, red } = kleur;

sade('create-wmr [dir]', true)
	.option('--eslint', 'Set up the Preact ESLint configuration (takes a lot longer)', false)
	.option('--force', 'Force install into an existing directory', false)
	.describe('Initialize a WMR project')
	.example('npm init wmr ./some-directory')
	.action(async (dir, opts) => {
		const origCwd = process.cwd();
		let cwd = process.cwd();
		if (dir) {
			try {
				if ((await fs.stat(dir)).isDirectory() && !opts.force) {
					process.stderr.write(
						`${red(
							`Refusing to overwrite directory! Please specify a different directory or use the '--force' flag`
						)}\n`
					);
					process.exit(1);
				}
			} catch {}
			cwd = resolve(cwd, dir || '.');
			try {
				await fs.mkdir(cwd, { recursive: true });
			} catch {
				process.stderr.write(
					`${red(
						`There is already a file with the same name as the directory you specified. Please provide a different directory name`
					)}\n`
				);
				process.exit(1);
			}
			process.chdir(cwd);
		}
		const ctx = {
			cwd,
			...opts,
			fields: {
				TITLE: opts.title || 'WMR App'
			}
		};
		const spinner = ora({
			color: 'yellow',
			text: 'installing WMR...'
		}).start();
		const packageManager = /yarn/.test(process.env.npm_execpath) ? 'yarn' : 'npm';
		// @ts-ignore-next
		await getPackageManager({ prefer: packageManager }).catch(() => {
			process.stderr.write(`\n${red(`${packageManager} cannot be found`)}\n`);
			process.exit(1);
		});
		await install(['wmr@^1.2.0', 'preact@^10.5.12', 'preact-iso@^1.0.0'], { prefer: packageManager, cwd });
		spinner.succeed('installed WMR.');

		if (opts.eslint) {
			spinner.start('installing eslint configuration...');
			await install(['eslint', 'eslint-config-preact'], { prefer: packageManager, cwd });
			spinner.succeed('installed eslint.');
		}

		spinner.start('scaffolding new project...');
		await scaffold(ctx);
		spinner.succeed('project created!');

		spinner.stop();
		if (dir) {
			console.log(
				`\n${bold('To get started:')}\n${dim('$')} ${cyan('cd ' + relative(origCwd, cwd).replace(/^\.[\\/]/, ''))}`
			);
		}
		const result = `
			Start the development server:
			${dim('$')} ${cyan(`${packageManager} start`)}

			Create a production build:
			${dim('$')} ${cyan(`${packageManager === 'npm' ? 'npm run' : 'yarn'} build`)}

			Serve the app in production mode:
			${dim('$ PORT=8080')} ${cyan(`${packageManager === 'npm' ? 'npm run' : 'yarn'} serve`)}
		`;
		console.log('\n' + result.trim().replace(/^\t\t\t/gm, '') + '\n');
		if (!opts.eslint) {
			console.log(
				`\n${bold('To enable ESLint:')} (optional)\n${dim('$')} ${cyan(
					`${packageManager === 'npm' ? 'npm i' : 'yarn add'} eslint eslint-config-preact`
				)}\n`
			);
		}
	})
	.parse(process.argv);

async function scaffold({ cwd, fields }) {
	await templateDir(resolve(__dirname, '../tpl'), resolve(cwd || '.'), fields);
}

async function templateDir(from, to, fields) {
	const files = await fs.readdir(from);
	const results = await Promise.all(
		files.map(async f => {
			if (f == '.' || f == '..') return;
			const filename = resolve(from, f);
			if ((await fs.stat(filename)).isDirectory()) {
				await fs.mkdir(resolve(to, f), { recursive: true });
				return templateDir(filename, resolve(to, f), fields);
			}
			let contents = await fs.readFile(filename, 'utf-8');
			contents = contents.replace(/%%([A-Z0-9_]+)%%/g, (s, i) => fields[i] || s);
			await fs.writeFile(resolve(to, f), contents);
		})
	);
	return results.flat(99);
}
