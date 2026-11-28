#!/usr/bin/env node
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, readdir, readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const env = {
	...process.env,
	PATH: [
		process.env.PATH,
		join(homedir(), ".local/bin"),
		"/opt/homebrew/bin",
		"/usr/local/bin",
		"/usr/bin",
		"/bin",
	]
		.filter(Boolean)
		.join(delimiter),
};
async function check(name, args = ["--version"]) {
	let path;
	for (const dir of env.PATH.split(delimiter)) {
		try {
			await access(join(dir, name), constants.X_OK);
			path = await realpath(join(dir, name));
			break;
		} catch {}
	}
	if (!path)
		return {
			ferramenta: name,
			disponivel: false,
			motivo: "Programa não encontrado",
		};
	try {
		const { stdout } = await run(path, args, {
			env,
			timeout: 15000,
			maxBuffer: 100000,
		});
		return {
			ferramenta: name,
			disponivel: true,
			caminho: path,
			resultado:
				name === "cua-driver"
					? {
							acessibilidade: JSON.parse(stdout).accessibility,
							gravacao_de_tela: JSON.parse(stdout).screen_recording,
							servico_ativo: JSON.parse(stdout).daemon_running,
						}
					: stdout.trim(),
		};
	} catch (error) {
		return {
			ferramenta: name,
			disponivel: false,
			caminho: path,
			motivo: error.killed
				? "Tempo de resposta excedido"
				: `Falha na verificação (${error.code ?? "sem código"})`,
		};
	}
}
const results = await Promise.all([
	check("codex"),
	check("claude"),
	check("agy"),
	check("cua-driver", ["permissions", "status", "--json"]),
]);
let host = false;
const dir = join(homedir(), ".paradev/host");
for (const id of await readdir(dir).catch(() => [])) {
	try {
		const config = JSON.parse(
			await readFile(join(dir, id, "manifest.json"), "utf8"),
		);
		const url = new URL(config.endpoint);
		if (!["127.0.0.1", "localhost"].includes(url.hostname)) continue;
		const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
		host ||= response.status < 500;
	} catch {}
}
console.log(
	JSON.stringify(
		{
			verificacao: "Peixoto IA",
			programas: results,
			servico_local_responde: host,
			observacao:
				"Versão não comprova login, saldo ou conexão MCP. Confira permissões no resultado do driver; nenhum comando de impressão é executado.",
		},
		null,
		2,
	),
);
process.exitCode =
	results.some((result) => !result.disponivel) || !host ? 1 : 0;
