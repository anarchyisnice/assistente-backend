// api/ask.js - Backend per Vercel
// Memoria temporanea per i promemoria (in produzione usare un database)
let promemoria = [];

export default async function handler(req, res) {
  // Abilita CORS per tutti i domini
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Gestisci richieste OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Accetta solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Messaggio richiesto' });
    }

    // Processa il messaggio come assistente AI
    const risposta = processaRichiestaAI(message.trim());
    
    return res.status(200).json({ 
      reply: risposta,
      status: 'success' 
    });

  } catch (error) {
    console.error('Errore nel processamento:', error);
    return res.status(500).json({ 
      error: 'Errore interno del server',
      reply: "Mi dispiace, ho avuto un problema tecnico. Riprova!"
    });
  }
}

function processaRichiestaAI(messaggio) {
  const msg = messaggio.toLowerCase();
  
  // 1. GESTIONE PROMEMORIA - Riconosce quando l'utente vuole creare un promemoria
  if (isRichiestaPromemoria(msg)) {
    const nuovoPromemoria = creaPromemoria(messaggio);
    promemoria.push(nuovoPromemoria);
    
    return JSON.stringify({
      tipo: 'promemoria_creato',
      titolo: nuovoPromemoria.titolo,
      data: nuovoPromemoria.data,
      messaggio: `✅ Promemoria salvato!\n📌 ${nuovoPromemoria.titolo}\n🕒 ${new Date(nuovoPromemoria.data).toLocaleString('it-IT')}`
    });
  }
  
  // 2. VISUALIZZA PROMEMORIA
  if (isRichiestaVisualizzaPromemoria(msg)) {
    return visualizzaPromemoria();
  }
  
  // 3. ELIMINA PROMEMORIA
  if (isRichiestaEliminaPromemoria(msg)) {
    return eliminaPromemoria(messaggio);
  }
  
  // 4. CHAT NORMALE - Risposte come assistente AI
  return rispondiComeAI(messaggio);
}

function isRichiestaPromemoria(msg) {
  const keywordsPromemoria = [
    'ricordami', 'promemoria', 'reminder', 'ricorda di', 'non dimenticare',
    'devo ricordare', 'appuntamento', 'nota che', 'salva che', 'memo'
  ];
  return keywordsPromemoria.some(keyword => msg.includes(keyword));
}

function isRichiestaVisualizzaPromemoria(msg) {
  const keywordsVedi = [
    'i miei promemoria', 'mostra promemoria', 'promemoria salvati', 
    'cosa devo ricordare', 'che promemoria ho', 'lista promemoria'
  ];
  return keywordsVedi.some(keyword => msg.includes(keyword));
}

function isRichiestaEliminaPromemoria(msg) {
  return msg.includes('elimina promemoria') || msg.includes('cancella promemoria');
}

function creaPromemoria(testo) {
  const ora = new Date();
  
  // Cerca pattern di tempo nel testo
  const regexTempo = /(\d{1,2}):(\d{2})|domani|oggi|stasera|mattina|pomeriggio/i;
  const matchTempo = testo.match(regexTempo);
  
  let dataPromemoria = new Date();
  
  if (matchTempo) {
    if (matchTempo[1] && matchTempo[2]) {
      // Orario specifico trovato (es. "15:30")
      dataPromemoria.setHours(parseInt(matchTempo[1]), parseInt(matchTempo[2]), 0, 0);
      if (dataPromemoria < ora) {
        // Se l'orario è già passato oggi, impostalo per domani
        dataPromemoria.setDate(dataPromemoria.getDate() + 1);
      }
    } else if (matchTempo[0].toLowerCase().includes('domani')) {
      dataPromemoria.setDate(dataPromemoria.getDate() + 1);
      dataPromemoria.setHours(9, 0, 0, 0);
    } else if (matchTempo[0].toLowerCase().includes('stasera')) {
      dataPromemoria.setHours(20, 0, 0, 0);
    } else if (matchTempo[0].toLowerCase().includes('mattina')) {
      dataPromemoria.setHours(9, 0, 0, 0);
    } else if (matchTempo[0].toLowerCase().includes('pomeriggio')) {
      dataPromemoria.setHours(15, 0, 0, 0);
    }
  } else {
    // Nessun tempo specifico, imposta per tra un'ora
    dataPromemoria.setHours(dataPromemoria.getHours() + 1);
  }

  // Estrai il titolo dal messaggio
  let titolo = testo.replace(/ricordami|promemoria|ricorda di|non dimenticare/gi, '').trim();
  titolo = titolo.replace(/(\d{1,2}):(\d{2})|domani|oggi|stasera|mattina|pomeriggio/gi, '').trim();
  
  if (!titolo || titolo.length < 3) {
    titolo = "Promemoria generico";
  }

  return {
    id: Date.now(),
    titolo: titolo,
    data: dataPromemoria.toISOString(),
    contenuto: testo,
    creato: ora.toISOString()
  };
}

function visualizzaPromemoria() {
  if (promemoria.length === 0) {
    return "📋 Non hai promemoria salvati al momento.";
  }
  
  let lista = "📋 I tuoi promemoria:\n\n";
  promemoria.forEach((p, index) => {
    const data = new Date(p.data);
    lista += `${index + 1}. 📌 ${p.titolo}\n   🕒 ${data.toLocaleString('it-IT')}\n\n`;
  });
  
  return lista;
}

function eliminaPromemoria(messaggio) {
  const numMatch = messaggio.match(/(\d+)/);
  if (numMatch) {
    const index = parseInt(numMatch[1]) - 1;
    if (index >= 0 && index < promemoria.length) {
      const eliminato = promemoria.splice(index, 1)[0];
      return `✅ Promemoria "${eliminato.titolo}" eliminato!`;
    }
  }
  return "❌ Promemoria non trovato. Usa 'elimina promemoria 1' per eliminare il primo della lista.";
}

function rispondiComeAI(messaggio) {
  const msg = messaggio.toLowerCase();
  
  // Saluti
  if (msg.includes('ciao') || msg.includes('salve') || msg.includes('buongiorno') || msg.includes('buonasera')) {
    const saluti = [
      "Ciao! 🧌 Come posso aiutarti oggi?",
      "Salve! Sono qui per assisterti. Cosa ti serve?",
      "Ciao! Sono il tuo assistente personale. Posso aiutarti con promemoria o rispondere alle tue domande!",
      "Buongiorno! 🌟 Come va? Posso fare qualcosa per te?"
    ];
    return saluti[Math.floor(Math.random() * saluti.length)];
  }
  
  // Domande su di sé
  if (msg.includes('chi sei') || msg.includes('cosa sei') || msg.includes('come ti chiami')) {
    return "Sono il tuo assistente personale 🧌! Posso aiutarti a gestire promemoria, rispondere a domande e chattare con te. Cosa ti serve?";
  }
  
  // Aiuto
  if (msg.includes('aiuto') || msg.includes('help') || msg.includes('cosa puoi fare')) {
    return `🧌 Ecco cosa posso fare per te:

📝 **Promemoria**: 
- "Ricordami di comprare il latte domani alle 18:00"
- "Promemoria appuntamento medico martedì"

📋 **Gestione**:
- "Mostra i miei promemoria"
- "Elimina promemoria 1"

💬 **Chat**: Posso rispondere a domande e chattare normalmente!

Cosa ti serve?`;
  }
  
  // Come stai
  if (msg.includes('come stai') || msg.includes('come va')) {
    return "Sto bene, grazie! 😊 Sono sempre pronto ad aiutarti. Tu come stai?";
  }
  
  // Matematica semplice
  if (msg.includes('+') || msg.includes('-') || msg.includes('*') || msg.includes('/')) {
    try {
      // Rimuovi spazi e caratteri non numerici/operatori
      const espressione = messaggio.replace(/[^0-9+\-*/().\s]/g, '');
      if (espressione.match(/^[\d+\-*/().\s]+$/)) {
        const risultato = eval(espressione);
        return `🧮 ${espressione} = ${risultato}`;
      }
    } catch (e) {
      return "Non riesco a calcolare questa espressione. Prova con operazioni più semplici!";
    }
  }
  
  // Risposte generiche intelligenti
  const risposteGeneriche = [
    "Interessante! Dimmi di più su questo argomento.",
    "Capisco quello che dici. Hai bisogno di aiuto con qualcosa di specifico?",
    "Hmm, fammi pensare... Puoi fornirmi più dettagli?",
    "È un punto di vista interessante! Come posso assisterti al meglio?",
    "Grazie per avermi detto questo. C'è qualcosa in particolare che vuoi sapere?",
    "Sono qui per aiutarti! Se hai domande specifiche o vuoi creare promemoria, dimmi pure.",
    "Mi fa piacere chattare con te! Hai bisogno di assistenza con qualcosa?"
  ];
  
  return risposteGeneriche[Math.floor(Math.random() * risposteGeneriche.length)];
}
