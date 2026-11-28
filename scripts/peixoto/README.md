# Confiabilidade do Peixoto IA

Cada conversa tem um arquivo privado de memória no `historyDir` do runtime, separado de outras conversas da mesma área. Um marcador no histórico preserva sua identidade nas trocas de agente/conta. O conteúdo é carregado em cada mensagem, inclusive após compactação. O agente recebe a instrução de atualizar decisões e verificações; isso não constitui uma garantia de que ele escreverá o arquivo. O arquivo original do histórico permanece disponível, com um índice parcial de pedidos para orientar a consulta. Excertos históricos não são uma síntese de decisões confirmadas. Anexos e ferramentas não importados não são apresentados como disponíveis.

O rodapé mostra modelo e raciocínio reportados pelo agente, sem substituir os valores por escolhas otimistas da interface. A ausência do valor aparece como desconhecida. O pré-teste das CLIs inclui os diretórios usuais do Mac; erros não ficam em cache para impedir recuperação após instalação.

`node scripts/peixoto/doctor.mjs` verifica versões, resposta do serviço local e permissões do driver, sem ler credenciais nem operar impressora. Não comprova login, cotas ou funcionamento de cada servidor MCP.

`python validate-3d.py ARQUIVO.stl --peca-unica --previa previa.png` produz relatório e prévia com trimesh e matplotlib. Retorno 1 significa geometria reprovada; retorno 2 significa falha de análise. A validação não fatia, não imprime e não comprova resistência mecânica. As dimensões são interpretadas em milímetros e devem ser comparadas com o pedido.

## Empacotamento e instalação

1. Execute testes e verificação de tipos; confirme o código no Git.
2. Compile o desktop deste checkout e execute `node scripts/peixoto/stamp-build.mjs`.
3. Execute `node scripts/package-personal-desktop.mjs`. O pacote inclui versão e commit; a fonte deve estar limpa e coincidir com o manifesto.
4. Execute `node scripts/peixoto/install.mjs '/caminho/Peixoto IA.app' --check`.
5. Com o aplicativo fechado e nenhum trabalho pendente, execute o mesmo comando sem `--check`. O instalador preserva a versão anterior e recusa retrocessos. Ele não encerra processos.

O instalador é o caminho canônico para versões pessoais. Scripts antigos externos a este checkout ainda podem substituir o aplicativo se forem usados diretamente. A base permanece 2.0.11; atualizações completas do upstream exigem validação própria para preservar as personalizações.
