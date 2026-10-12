export type FichaProduto = {
  grupo: string;
  descricao: string;
  aplicacao: string;
  foto: string;
};

function semAcento(valor: string): string {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function planta(nome: string): string {
  const base = semAcento(nome).split("/")[0]?.split("-")[0] ?? nome;
  return base.replace(/\d+\s*g\b/g, "").replace(/\bkg\b/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Texto e foto da vitrine a partir do nome que já está no cadastro.
 * A equipe pode trocar depois; isto só preenche o que ainda está vazio.
 */
export function fichaDoProduto(nome: string): FichaProduto {
  const n = semAcento(nome);
  const preparado = /higieniz|descasc|fatiad/.test(n);
  const micro = /microverde/.test(n);
  const restaurante = /restaurante/.test(n);

  if (/flor/.test(n)) {
    return {
      grupo: "Flores",
      descricao: "Flores comestíveis, colhidas para ir ao prato.",
      aplicacao: "Finalização de prato, drink e sobremesa.",
      foto: "/produtos/flores.jpg?v=4",
    };
  }
  if (/molho/.test(n)) {
    return {
      grupo: "Molhos",
      descricao: "Molho porcionado para acompanhar a salada.",
      aplicacao: "Porção individual no serviço e no delivery.",
      foto: "/produtos/molho.jpg",
    };
  }
  if (micro) {
    const qual = planta(nome).replace("microverde", "").replace("microverdes", "").trim();
    const fotoMicro = /beterraba/.test(n)
      ? "/produtos/micro-beterraba.jpg"
      : /coentro/.test(n)
        ? "/produtos/micro-coentro.jpg"
        : /couve/.test(n)
          ? "/produtos/micro-couve.jpg"
          : /mostarda/.test(n)
            ? "/produtos/micro-mostarda.jpg"
            : /rabanete|rabano/.test(n)
              ? "/produtos/micro-rabanete.jpg"
              : /repolho/.test(n)
                ? "/produtos/micro-repolho-roxo.jpg"
                : /rucula/.test(n)
                  ? "/produtos/micro-rucula.jpg"
                  : "/produtos/microverde.jpg";
    return {
      grupo: "Microverdes",
      descricao: qual
        ? `Microverde de ${qual}, colhido jovem e com sabor concentrado.`
        : "Microverdes colhidos jovens, com sabor concentrado.",
      aplicacao: "Finalização de prato, sanduíche e entrada.",
      foto: fotoMicro,
    };
  }
  if (/baby/.test(n) && /manjericao/.test(n)) {
    return {
      grupo: "Ervas",
      descricao: "Manjericão jovem, de folha macia.",
      aplicacao: "Finalização, molho e salada.",
      foto: "/produtos/baby-manjericao.jpg",
    };
  }
  if (/baby/.test(n)) {
    return {
      grupo: "Folhas",
      descricao: "Folhas jovens, macias e de sabor delicado.",
      aplicacao: "Salada, bowl e finalização.",
      foto: "/produtos/baby.jpg",
    };
  }
  if (/^mix| mix /.test(` ${n}`)) {
    return {
      grupo: "Saladas",
      descricao: /desfolh/.test(n)
        ? "Folhas já separadas, no mix pronto para servir."
        : "Mistura pronta de folhas, no peso da embalagem.",
      aplicacao: /crocante|classico|leve|chefe|tudo/.test(n)
        ? "Salada servida, bowl e acompanhamento."
        : "Salada, bowl e linha fria.",
      foto: /rucula/.test(n) ? "/produtos/mix-rucula.jpg" : "/produtos/mix.jpg?v=2",
    };
  }

  const folha = (descricao: string, foto: string, aplicacao = "Salada, sanduíche e acompanhamento."): FichaProduto => ({
    grupo: preparado ? "Processados" : "Folhas",
    descricao: preparado ? `${descricao} Lavada e preparada para a cozinha.` : descricao,
    aplicacao: preparado ? "Mise en place, salada e linha fria." : aplicacao,
    foto,
  });

  if (/frisee|excentric/.test(n)) return folha("Alface frisée, de folha fina e textura crocante.", "/produtos/frisee.jpg");
  if (/americana/.test(n)) return folha("Alface americana, de cabeça fechada e folha crocante.", "/produtos/americana.jpg");
  if (/crespa roxa|roxa/.test(n) && /alface|crespa/.test(n)) {
    return folha("Alface crespa roxa, de cor intensa e folha solta.", "/produtos/alface-roxa.jpg");
  }
  if (/alface/.test(n)) return folha("Alface crespa verde, de folha solta e sabor suave.", "/produtos/alface.jpg");
  if (/rucula/.test(n)) return folha("Rúcula de sabor marcado, para salada e finalização.", "/produtos/rucula.jpg", "Salada, pizza e finalização.");
  if (/manjericao/.test(n)) {
    return {
      grupo: "Ervas",
      descricao: "Manjericão de folha fina, colhido para uso fresco.",
      aplicacao: "Molho, finalização e salada.",
      foto: "/produtos/manjericao.jpg",
    };
  }
  if (/hortela/.test(n)) {
    return {
      grupo: "Ervas",
      descricao: "Hortelã fresca.",
      aplicacao: "Drink, sobremesa e finalização.",
      foto: "/produtos/hortela.jpg",
    };
  }
  if (/coentro/.test(n)) {
    return {
      grupo: "Ervas",
      descricao: "Coentro fresco.",
      aplicacao: "Salada, molho e cozinha quente.",
      foto: "/produtos/coentro.jpg",
    };
  }
  if (/agriao/.test(n)) return folha("Agrião de sabor picante e folha tenra.", "/produtos/agriao.jpg");
  if (/acelga/.test(n)) return folha("Acelga de talo firme e folha ampla.", "/produtos/acelga.jpg", "Refogado, salada e suco verde.");
  if (/mostarda/.test(n)) return folha("Mostarda de folha, com picância leve.", "/produtos/mostarda.jpg");
  if (/couve/.test(n)) return folha("Couve de folha, para refogado e salada.", "/produtos/couve.jpg", "Refogado, salada e suco.");

  const legume = (descricao: string, foto: string): FichaProduto => ({
    grupo: preparado ? "Processados" : "Legumes",
    descricao: preparado ? `${descricao} ${/fatiad/.test(n) ? "Lavada, descascada e fatiada." : "Lavada e descascada."}` : descricao,
    aplicacao: preparado ? "Mise en place e linha quente." : "Cocção, salada e acompanhamento.",
    foto,
  });

  if (/repolho roxo/.test(n)) return legume("Repolho roxo, de cor firme.", "/produtos/repolho-roxo.jpg?v=3");
  if (/repolho/.test(n)) return legume("Repolho verde.", "/produtos/repolho.jpg?v=3");
  if (/cebola roxa/.test(n)) return legume("Cebola roxa.", "/produtos/cebola-roxa.jpg?v=3");
  if (/cebola/.test(n)) return legume("Cebola branca.", "/produtos/cebola.jpg?v=3");
  if (/alho/.test(n)) return legume("Alho descascado e higienizado.", "/produtos/alho.jpg?v=3");
  if (/batata portuguesa/.test(n)) return legume("Batata portuguesa.", "/produtos/batata.jpg?v=3");
  if (/batata/.test(n)) return legume("Batata bolinha.", "/produtos/batata-bolinha.jpg?v=2");
  if (/cenoura/.test(n)) return legume("Cenoura.", "/produtos/cenoura.jpg?v=3");
  if (/beterraba/.test(n)) return legume("Beterraba.", "/produtos/beterraba.jpg?v=3");
  if (/tomate/.test(n)) return legume("Tomate.", "/produtos/tomate.jpg");
  if (/nabo/.test(n)) return legume("Nabo japonês, de sabor suave.", "/produtos/nabo.jpg");
  if (/rabanete|rabano/.test(n)) return legume("Rabanete, de polpa firme e sabor leve.", "/produtos/rabanete.jpg");

  if (/plano/.test(n)) {
    return {
      grupo: "Planos",
      descricao: "Porção fechada do plano, no peso combinado.",
      aplicacao: restaurante ? "Entrega recorrente para a cozinha." : "Entrega recorrente.",
      foto: "/produtos/mix.jpg?v=2",
    };
  }

  return {
    grupo: preparado ? "Processados" : "Da fazenda",
    descricao: preparado ? "Lavado e preparado para a cozinha." : "Produto da fazenda, no padrão de entrega.",
    aplicacao: preparado ? "Mise en place." : "Cozinha e salada.",
    foto: "/uploads/IMG_7964.jpg",
  };
}
