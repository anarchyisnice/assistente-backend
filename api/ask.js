// api/ask.js - Backend per Vercel
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

    // Processamento semplice del messaggio
    const risposta = processaMessaggio(message);
    
    return res.status(200).json({ 
      reply: JSON.stringify(risposta),
      status: 'success' 
    });

  } catch (error) {
    console.error('Errore nel processamento:', error);
    return res.status(500).json({ 
      error: 'Errore interno del server',
      reply: JSON.stringify({
        titolo: "Messaggio ricevuto",
        data: new Date().toISOString(),
        contenuto: req.body.message || "Messaggio vuoto"
      })
    });
  }
}

function processaMessaggio(testo) {
  // Analisi semplice del testo per creare un promemoria
  const ora = new Date();
  
  // Cerca pattern di tempo nel testo
  const regexTempo = /(\d{1,2}):(\d{2})|domani|oggi|stasera|mattina/i;
  const matchTempo = testo.match(regexTempo);
  
  let dataPromemoria = new Date();
  
  if (matchTempo) {
    if (matchTempo[1] && matchTempo[2]) {
      // Orario specifico trovato (es. "15:30")
      dataPromemoria.setHours(parseInt(matchTempo[1]), parseInt(matchTempo[2]), 0, 0);
    } else if (matchTempo[0].toLowerCase().includes('domani')) {
      // Aggiunge un giorno
      dataPromemoria.setDate(dataPromemoria.getDate() + 1);
    } else if (matchTempo[0].toLowerCase().includes('stasera')) {
      dataPromemoria.setHours(20, 0, 0, 0);
    } else if (matchTempo[0].toLowerCase().includes('mattina')) {
      dataPromemoria.setHours(9, 0, 0, 0);
    }
  } else {
    // Nessun tempo specifico, imposta per tra un'ora
    dataPromemoria.setHours(dataPromemoria.getHours() + 1);
  }

  // Estrai il titolo dal messaggio (prime 50 caratteri)
  let titolo = testo.length > 50 ? testo.substring(0, 47) + '...' : testo;
  
  // Rimuovi parole di tempo dal titolo
  titolo = titolo.replace(/(\d{1,2}):(\d{2})|domani|oggi|stasera|mattina/gi, '').trim();
  
  if (!titolo) {
    titolo = "Promemoria";
  }

  return {
    titolo: titolo,
    data: dataPromemoria.toISOString(),
    contenuto: testo,
    tipo: 'promemoria',
    creato: ora.toISOString()
  };
}
