/*
 * CONFIGURAÇÃO DO TESTE
 */
window.CONFIG = {

  /*
   * Texto codificado no QR Code impresso (aqui é só um identificador).
   */
  QR_PREFIXO: 'receitaqueseve://paciente/',

  /*
   * Roteiro exibido ao testador. Pensado para comparar a primeira receita
   * (montada manualmente) com a segunda (montada a partir de um modelo).
   */
  TAREFAS: [
    'Preencha a unidade de atendimento e a data.',
    'Busque o paciente pelo CPF ou CNS. Como ele ainda não está cadastrado, cadastre-o com dados fictícios.',
    'Adicione medicamentos à receita, escolhendo forma, via, quantidade, horários, duração e cuidados.',
    'Salve esses medicamentos como um modelo e conclua a receita.',
    'Clique em "Fazer nova receita", busque o mesmo paciente pelo CPF ou CNS e monte a receita usando o modelo salvo.',
    'Conclua a segunda receita e clique em "Finalizar teste".'
  ]
};
