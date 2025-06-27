// api/ask.js - Backend per Vercel con Groq AI
// Memoria temporanea per i promemoria (in produzione usare un database)
let promemoria = [];

// Configurazione Groq (inserisci la tua API key nelle variabili d'ambiente Vercel)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

    // Controlla se è una richiesta di promemoria
    if (isRichiestaPromemoria(message.toLowerCase())) {
      const nuovoPromemoria = creaPromemoria(message);
      promemoria.push(nuovoPromemoria);
      
      const messaggioPromemoria = `✅ Promemoria salvato!\n📌 ${nuovoPromemoria.titolo}\n🕒 ${new Date(nuovoPromemoria.data).toLocaleString('it-IT')}`;
      
      return res.status(200).json({ 
        reply: messaggioPromemoria,
        type: 'promemoria',
        status: 'success' 
      });
    }
    
    // Controlla se vuole vedere i promemoria
    if (isRichiestaVisualizzaPromemoria(message.toLowerCase())) {
      const listaPromemoria = visualizzaPromemoria();
      return res.status(200).json({ 
        reply: listaPromemoria,
        type: 'lista_promemoria',
        status: 'success' 
      });
    }
    
    // Controlla se vuole eliminare promemoria
    if (isRichiestaEliminaPromemoria(message.toLowerCase())) {
      const risultato = eliminaPromemoria(message);
      return res.status(200).json({ 
        reply: risultato,
        type: 'elimina_promemoria',
        status: 'success' 
      });
    }

    // Per tutto il resto, usa Groq AI
    const rispostaAI = await chiamaGroqAI(message);
    
    return res.status(200).json({ 
      reply: rispostaAI,
      type: 'ai_response',
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

async function chiamaGroqAI(messaggio) {
  if (!GROQ_API_KEY) {
    return "⚠️ API Key di Groq non configurata. Aggiungi GROQ_API_KEY nelle variabili d'ambiente di Vercel.";
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `Sei un assistente AI personale chiamato "Assistente 🧌". Sei amichevole, utile e parli in italiano. 

Oltre a rispondere normalmente alle domande, hai una funzione speciale per i promemoria:
- Se l'utente vuole creare un promemoria, digli di usare frasi come "ricordami di..." o "promemoria per..."
- Se chiede dei suoi promemoria salvati, digli di scrivere "mostra promemoria" o "i miei promemoria"
- Mantieni sempre un tono amichevole e professionale
- Rispondi in modo conciso ma completo`
          },
          {
            role: "user",
            content: messaggio
          }
        ],
        model: "llama-3.1-70b-versatile", // Modello Groq veloce e potente
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error('Errore chiamata Groq:', error);
    return "Mi dispiace, al momento non riesco a connettermi al servizio AI. Riprova tra poco!";
  }
}

function isRichiestaPromemoria(msg) {
  const keywordsPromemoria = [
    'ricordami', 'promemoria', 'reminder', 'ricorda di', 'non dimenticare',
    'devo ricordare', 'appuntamento', 'nota che', 'salva che', 'memo',
    'aggiungi al calendario', 'segna che'
  ];
  return keywordsPromemoria.some(keyword => msg.includes(keyword));
}

function isRichiestaVisualizzaPromemoria(msg) {
  const keywordsVedi = [
    'i miei promemoria', 'mostra promemoria', 'promemoria salvati', 
    'cosa devo ricordare', 'che promemoria ho', 'lista promemoria',
    'vedi promemoria', 'calendari', 'appuntamenti salvati'
  ];
  return keywordsVedi.some(keyword => msg.includes(keyword));
}

function isRichiestaEliminaPromemoria(msg) {
  return msg.includes('elimina promemoria') || msg.includes('cancella promemoria') || 
         msg.includes('rimuovi promemoria');
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
