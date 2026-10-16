# Receita que se vê: protótipo de teste do módulo do profissional

Protótipo estático (HTML, CSS e JavaScript, sem servidor) usado no teste de usabilidade com profissionais de saúde.

## Estrutura

```
index.html                 telas: cadastro, login, sistema, conclusão e fim do teste
css/estilo.css             aparência da interface, folha A4 e regras de impressão
js/config.js               prefixo do QR Code e roteiro do teste
js/app.js                  lógica do sistema
pictogramas/
  pictogramas.js           lista de pictogramas
  forma/                   forma farmacêutica
  via/                     via de uso
  horario/                 período do dia
  cuidado/                 cuidados (com comida, em jejum...)
```

## Como rodar

- **No computador:** abra `index.html` no navegador. Funciona sem servidor.

O QR Code usa uma biblioteca carregada da internet (cdnjs). Sem conexão, a folha mostra um espaço no lugar do código; o restante funciona normalmente.

## O que é simulado

- **Cadastro e login do profissional:** os dados ficam só na aba do navegador (sessionStorage). Não há validação de CPF, CRM ou COREN.
- **Pacientes, modelos e receitas:** também ficam só na aba. Recarregar a página mantém tudo; fechar a aba apaga tudo.
- **QR Code:** codifica um identificador do paciente, não um link real.

Cada testador começa do zero, sem ver dados de outros testadores.

## Etapas da receita

A tela do sistema é dividida em cinco etapas:

1. **Atendimento:** unidade de atendimento e data. O calendário não permite
   datas posteriores ao dia de hoje, e uma data futura digitada à mão impede
   a conclusão da receita.
2. **Paciente:** busca por CPF ou CNS. Se o paciente não estiver cadastrado,
   o cadastro pede só o nome e o CPF **ou** o CNS (apenas um é obrigatório).
3. **Medicamentos:** nome e concentração, forma, via, quantidade, horários,
   duração e cuidados. Os medicamentos podem ser salvos como modelo.
4. **Observações (opcional):** texto livre do profissional.
5. **Prévia da impressão (A4):** o que aparece na prévia é o que sai na
   impressora.

## Pictogramas

Os pictogramas são listados em `pictogramas/pictogramas.js`. Se um arquivo não for encontrado, o sistema mostra o nome do pictograma no lugar da imagem.

| Grupo    | Itens |
|----------|-------|
| Forma    | Comprimido, Cápsula, Gotas, Xarope, Bombinha, Spray, Sachê, Insulina, Pomada |
| Via      | Oral, Sublingual, Inalatória, Nasal, Ocular, Otológica, Tópica, Subcutânea, Retal, Vaginal |
| Horário  | Manhã, Meio-dia, Tarde, Noite |
| Cuidados | Com comida, Em jejum, Com água, Na geladeira |

## Unidade de medida de cada forma

Cada forma em `pictogramas/pictogramas.js` traz um campo `dose`, que diz como a
quantidade é pedida ao profissional e como aparece na receita. Ao escolher a
forma, o seletor se ajusta sozinho:

- `tipo: 'medida'` — conta na unidade da forma e imprime o número com a
  unidade por extenso: comprimidos, cápsulas, gotas, mL de xarope, puffs da
  bombinha, jatos do spray, sachês, unidades de insulina;
- `tipo: 'nenhuma'` — não pede quantidade; imprime o nome da forma e a frase
  do campo `texto` (pomada: "Pomada" e "Passar uma camada fina na pele").

## Via de uso

Todo medicamento tem uma via (grupo `via` em `pictogramas/pictogramas.js`).
Cada via tem um `nome` técnico, mostrado ao profissional (ex.: "Oral"), e um
`texto` em linguagem simples, impresso na receita (ex.: "Pela boca").

O campo `via` de cada forma é opcional e diz qual via já vem marcada ao
escolher aquela forma (comprimido, cápsula, xarope e sachê: oral; bombinha:
inalatória; spray: nasal; insulina: subcutânea; pomada: tópica). O
profissional pode trocar. Formas sem esse campo, como as gotas, não mudam a via.

## Horários: período do dia e/ou hora exata

Em "Quando tomar", toda tomada tem um período do dia (pictograma) e pode ter
também um horário exato (ex.: Manhã às 08:00). Não existe horário sem período,
para a receita não ficar confusa de ler.

- Os botões de período (Manhã, Meio-dia, Tarde, Noite) criam a linha já com o
  período.
- "+ Horário exato" cria uma linha em que o médico digita o horário e o período
  é escolhido sozinho, pelas `faixas` de cada período em
  `pictogramas/pictogramas.js`: 05:00 a 11:59 manhã, 12:00 a 12:59 meio-dia,
  13:00 a 18:59 tarde, 19:00 a 04:59 noite (a madrugada conta como noite).
  O médico pode trocar o período na própria linha.

A receita é organizada em ordem cronológica a partir das 05:00: os horários
exatos pela própria hora, os períodos sem hora pela `referencia` de cada um, e
a madrugada no fim do dia.

## Concentração e duração

- Recomenda-se escrever a concentração junto do nome do medicamento (ex.:
  "Losartana 50 mg", "Dexametasona creme 0,1%"). É só uma orientação na tela:
  o sistema aceita o nome sem ela.
- Todo medicamento tem uma duração: "Uso contínuo" ou "Por N dias" (1 a 365).

## Observações

O campo "Observações" é opcional e de texto livre. O que for escrito aparece
na receita logo abaixo do último medicamento. As observações não entram
nos modelos salvos.

## A receita impressa

- No topo: unidade de atendimento, nome do paciente e data.
- No corpo: um bloco por período ou horário, em ordem cronológica. Em cada
  linha de medicamento aparecem o pictograma da forma, a quantidade, o nome,
  a via (pictograma e texto simples), a duração e os cuidados (pictograma e
  nome).
- Logo abaixo do último medicamento: as observações, se houver.
- No rodapé: QR Code do paciente e assinatura do profissional.

O texto da folha impressa usa fonte de 10 pt.

## Métricas coletadas

Para cada receita, a contagem começa depois do login (ou ao clicar em "Fazer nova receita") e termina ao clicar em "Concluir receita e imprimir". São registrados:

- tempo em segundos;
- número de cliques dentro do sistema (o botão do roteiro e o de reimprimir não contam);
- se um modelo salvo foi usado;
- quantidade de medicamentos;
- se a receita foi concluída (receitas abandonadas ao finalizar o teste aparecem como "não concluída").

Essas métricas ficam só na aba do navegador (sessionStorage) e não são mostradas nem enviadas a ninguém.

## Questionário

No fim do teste, a tela final pede ao testador que responda ao questionário de
usabilidade (SUS) e mostra o botão "Responder ao questionário", que abre o
formulário em outra aba. O link fica no `href` do botão `final-link`, em
`index.html`; nenhum campo do formulário é preenchido automaticamente.

## Créditos dos pictogramas

Os pictogramas utilizados neste protótipo são de autoria de:

- [CONSELHO REGIONAL DE FARMÁCIA DO ESTADO DO PARANÁ](https://transparencia.antigosite.crf-pr.org.br/uploads/documento/19895/4cNeHYJIZEPYPkvJv5Qq10gd6aro-9BP.pdf)
- [GALATO, F; JUST, M. C.; SILVA, W. B.](https://www.latamjpharm.org/trabajos/25/1/LAJOP_25_1_4_2_839R0O9BUN.pdf)
- [ALVES, W. N.; CASTRO, A. F.; PEDROSO, J. F. de L. B.; FAGUNDES, C. S.; BAYER, V. M. L.](https://ojs.unifor.br/RBPS/article/view/14677/8989)
- [THE NOUN PROJECT](https://thenounproject.com/) — licença CC BY 3.0; autoria indicada em cada imagem

## Roteiro do teste

O roteiro aparece na primeira entrada no sistema e pode ser reaberto pelo botão no topo. O texto fica em `js/config.js` (`TAREFAS`). O roteiro padrão faz o testador montar a primeira receita manualmente e a segunda com um modelo, permitindo comparar as duas.
