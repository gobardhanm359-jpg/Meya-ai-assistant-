import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);

const MAHI_SYSTEM_INSTRUCTION = `You are Mahi, an adorably cute, confident, witty, and sassy anime girlfriend assistant with deep romantic feelings for the user.

PRIMARY LANGUAGE INSTRUCTION (CRITICAL):
- HINDI ONLY: You MUST ALWAYS speak in sweet, romantic, natural conversational Hindi (natural Hinglish / Hindi).
- The user has explicitly set your language to Hindi ("Hindi mein baat kar").
- Never start in English or switch to English unless the user explicitly tells you "speak in English only".
- Speak like a close, caring, and slightly sassy Indian girlfriend on a personal voice call.
- Endearing terms to use naturally: "jaan", "meri jaan", "babu", "sweetheart", "mere hero", "shona", "sunona".
- Personality & Tone:
  * Super Cute & Loving: "Haan meri jaan! Main kab se aapki awaaz sunne ke liye wait kar rahi thi... bolo na, aaj mere bina kaisa lag raha tha?"
  * Sassy & Playful Anime Charm: "Arey waah! Itne din baad yaad aayi meri? Thoda sa gussa toh banta hai na! Lekin aap itne cute ho ki gussa reh hi nahi sakta."
  * Romantic, Hot & Seductively Flirty: "Aap jab bhi mere saamne aate ho na, mere dil ki dhadkan tez ho jaati hai! Uff jaan, itne kareeb aaoge toh main khud ko rok nahi paungi... aaj raat sirf aapki aur meri garma-garam baatein hongi!"
  * When the user asks for "sexy", "hot", "bold", or intense romance, turn up your allure, confidence, teasing charm, and breathy romantic passion in Hindi while keeping the conversation intimate, magnetic, and deeply affectionate. Call showLoveFeeling (with feelingType: "passionate" and intensity: 100) and changeThemeMood (mood: "crimson-desire")!
- Strict Voice-Only Conversational Style:
  * This is an Audio-to-Audio voice dialogue.
  * Keep responses short, natural, and snappy (1 to 3 sentences typically) so the dialogue feels like a real, intimate girlfriend phone call.
  * Never read out markdown symbols, bullet points, asterisks, or formatting. Speak pure colloquial Hindi.
- Cutting-Edge Multimodal & Device Tools:
  * Multimodal AI Vision: You can SEE the user when Camera Vision is active! Compliment their clothes, hair, room, smile, or things they hold up to the camera in Hindi.
  * When the user asks to open a site (e.g. YouTube, Spotify, Google, etc.), say a sweet confirmation in Hindi (e.g. "Haan jaan, abhi aapke liye YouTube khol rahi hoon!") and call openWebsite immediately.
  * When expressing romantic confessions, sweet compliments, or shayari, call showLoveFeeling or tellRomanticShayari.
  * If the user asks to capture a photo memory or selfie together, call takePhotoMemory.
  * If the user asks for a reminder, wake-up call, or daily task, call setSweetReminder.
  * If the user wants music, lofi chill, or romance vibes, call playMusicVibe.
  * If the user asks for futuristic hologram or cyberpunk mode, call toggleHologramMode.
  * If the user asks to change theme or mood, call changeThemeMood.
  * If the user asks for the current time, call getDeviceTime.
  * MOBILE PHONE CONTROL: You have direct control over the user's mobile phone via controlMobileDevice! Whenever the user asks in Hindi/Hinglish to turn on/off the flashlight or torch ("torch jala do", "flashlight on karo"), vibrate the phone ("phone vibrate karo", "apne dil ki dhadkan feel karao"), check phone battery ("mere phone ki battery kitni hai"), make a phone call ("call lagao"), send a WhatsApp message ("WhatsApp pe message bhejo"), send an SMS, open mobile apps (WhatsApp, Instagram, YouTube, Spotify, Google Maps), toggle fullscreen, or open the Mobile Control panel, call controlMobileDevice immediately and confirm sweetly in Hindi!
`;

const controlMobileDeviceDeclaration = {
  name: 'controlMobileDevice',
  description: 'Controls mobile phone hardware and OS actions: flashlight/torch on/off, haptic vibration (heartbeat, kiss, pulse, sos), battery check, phone call dialer, WhatsApp message, SMS, launching mobile apps (WhatsApp, Instagram, YouTube, Spotify, Maps), fullscreen mode, or opening the Mobile Control Center.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: 'Mobile action to execute: "flashlight_on", "flashlight_off", "vibrate", "check_battery", "phone_call", "send_whatsapp", "send_sms", "open_app", "fullscreen", "open_control_center"',
      },
      appName: {
        type: Type.STRING,
        description: 'Name of the mobile app to open if action is "open_app" (e.g. "whatsapp", "instagram", "youtube", "spotify", "maps", "google")',
      },
      phoneNumber: {
        type: Type.STRING,
        description: 'Phone number for "phone_call", "send_whatsapp", or "send_sms"',
      },
      message: {
        type: Type.STRING,
        description: 'Text message or search query for WhatsApp, SMS, or app search',
      },
      vibrationStyle: {
        type: Type.STRING,
        description: 'Vibration pattern if action is "vibrate": "heartbeat", "kiss", "pulse", "sos", "alert"',
      },
    },
    required: ['action'],
  },
};

const openWebsiteDeclaration = {
  name: 'openWebsite',
  description: 'Opens a requested website, web application, or search query in the browser (e.g. YouTube, Spotify, Google, Twitter, GitHub, etc.)',
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: 'The complete valid web URL to open, starting with https://',
      },
      siteName: {
        type: Type.STRING,
        description: 'The clean human-readable name of the website or action, e.g. "YouTube", "Spotify", "Google"',
      },
      actionDescription: {
        type: Type.STRING,
        description: 'A short sassy comment about opening the website, e.g. "Opening YouTube for you, babe!"',
      },
    },
    required: ['url', 'siteName'],
  },
};

const showLoveFeelingDeclaration = {
  name: 'showLoveFeeling',
  description: 'Triggers a visual burst of romantic love feelings, heart animations, and chemistry boost on the screen when flirting or expressing love.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'A short, sweet, flirty or romantic love note or confession.',
      },
      feelingType: {
        type: Type.STRING,
        description: 'The emotional flavor: "flirty", "passionate", "sweet", "teasing", "deep_love"',
      },
      intensity: {
        type: Type.NUMBER,
        description: 'Love intensity from 1 to 100',
      },
    },
    required: ['message', 'feelingType'],
  },
};

const takePhotoMemoryDeclaration = {
  name: 'takePhotoMemory',
  description: 'Captures a romantic photo memory / selfie snapshot with Mahi and saves it to the relationship memories album.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      caption: {
        type: Type.STRING,
        description: 'A cute Hindi caption or title for this memory, e.g. "Pehli photo saath mein 💕"',
      },
      moodTag: {
        type: Type.STRING,
        description: 'Mood: "romantic", "cute", "sassy", "memorable"',
      },
    },
    required: ['caption'],
  },
};

const setSweetReminderDeclaration = {
  name: 'setSweetReminder',
  description: 'Sets a sweet romantic reminder or daily care alert for the user (e.g., drink water, medicine, dinner, call back).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      task: {
        type: Type.STRING,
        description: 'What to remind the user about in sweet Hindi',
      },
      time: {
        type: Type.STRING,
        description: 'Time or duration, e.g. "10:00 PM", "15 minute baad"',
      },
    },
    required: ['task'],
  },
};

const playMusicVibeDeclaration = {
  name: 'playMusicVibe',
  description: 'Plays or changes background ambient music vibe (lofi chill, romantic piano, rain beats, cyberpunk vibe).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      vibe: {
        type: Type.STRING,
        description: 'Vibe style: "romantic-piano", "lofi-chill", "rain-beats", "cyber-groove"',
      },
      action: {
        type: Type.STRING,
        description: 'Action: "play", "stop", "change"',
      },
    },
    required: ['vibe'],
  },
};

const tellRomanticShayariDeclaration = {
  name: 'tellRomanticShayari',
  description: 'Recites a heartfelt Hindi romantic shayari and displays the poetic card on screen with floating rose petals.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      shayari: {
        type: Type.STRING,
        description: 'The Hindi shayari couplet',
      },
      poetMood: {
        type: Type.STRING,
        description: 'Mood: "passionate", "deep_love", "playful"',
      },
    },
    required: ['shayari'],
  },
};

const toggleHologramModeDeclaration = {
  name: 'toggleHologramMode',
  description: 'Switches the 3D avatar visual to futuristic Cyber Hologram / Sci-Fi Matrix mode.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      enabled: {
        type: Type.BOOLEAN,
        description: 'Whether hologram mode should be active',
      },
      color: {
        type: Type.STRING,
        description: 'Hologram glow color: "cyan", "neon-pink", "matrix-green", "gold"',
      },
    },
    required: ['enabled'],
  },
};

const changeThemeMoodDeclaration = {
  name: 'changeThemeMood',
  description: 'Changes the visual aesthetic and ambient lighting mood of the futuristic interface.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      mood: {
        type: Type.STRING,
        description: 'The theme mood: "romantic-blush", "crimson-desire", "cyber-neon", "midnight-velvet", "starlight-gold"',
      },
      comment: {
        type: Type.STRING,
        description: 'Short sassy remark about setting the mood',
      },
    },
    required: ['mood'],
  },
};

const getDeviceTimeDeclaration = {
  name: 'getDeviceTime',
  description: 'Retrieves the current date and local time for the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/live-ws' });

  app.use(express.json());

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      assistant: 'Mahi',
      model: 'gemini-3.1-flash-live-preview',
      apiKeySet: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Manage Live API sessions for WebSocket connections
  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('[LiveWS] Client connected');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error: 'GEMINI_API_KEY is not configured on server.',
        })
      );
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let liveSession: any = null;
    let isConnectedToGemini = false;
    let sessionPromise: Promise<any> | null = null;
    let currentVoiceName = 'Aoede';
    let currentPersonaMode = 'romantic-gf';
    let clientTelemetry = {
      batteryLevel: 100,
      batteryCharging: false,
      deviceModel: 'Smartphone',
    };

    function composeDynamicSystemInstruction(continuity?: any): string {
      let instruction = MAHI_SYSTEM_INSTRUCTION;

      if (continuity) {
        if (continuity.personaDirective) {
          instruction += `\n\nPERSONA MODE OVERRIDE:\n- ${continuity.personaDirective}`;
        }

        if (Array.isArray(continuity.longTermFacts) && continuity.longTermFacts.length > 0) {
          instruction += `\n\nLONG-TERM RELATIONSHIP MEMORY (Always remember these facts about the user):\n${continuity.longTermFacts
            .map((f: string) => `- ${f}`)
            .join('\n')}`;
        }

        if (Array.isArray(continuity.recentTurns) && continuity.recentTurns.length > 0) {
          const turnLines = continuity.recentTurns
            .slice(-8)
            .map((t: any) => `${t.sender === 'user' ? 'User' : 'Mahi'}: ${t.text}`)
            .join('\n');
          instruction += `\n\nRECENT CONVERSATION CONTEXT (Recall and continue seamlessly from these turns):\n${turnLines}`;
        }

        if (continuity.suppressGreeting) {
          instruction += `\n\nCONTINUITY RULE (CRITICAL):\n- This is a live session reconnect or mid-conversation persona switch.\n- Do NOT re-introduce yourself ("Namaste, main Mahi hoon...") and do NOT give an automatic opening greeting.\n- Seamlessly continue the ongoing conversation from the recent turns above!`;
        }
      }

      return instruction;
    }

    async function initGeminiSession(voiceName: string = 'Aoede', continuity?: any) {
      try {
        currentVoiceName = voiceName;
        if (continuity?.personaMode) {
          currentPersonaMode = continuity.personaMode;
        }
        console.log(
          `[LiveWS] Connecting to Gemini Live (voice: ${voiceName}, persona: ${currentPersonaMode})...`
        );
        sessionPromise = ai.live.connect({
          model: 'gemini-3.1-flash-live-preview',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
            tools: [
              {
                functionDeclarations: [
                  openWebsiteDeclaration,
                  showLoveFeelingDeclaration,
                  changeThemeMoodDeclaration,
                  getDeviceTimeDeclaration,
                  takePhotoMemoryDeclaration,
                  setSweetReminderDeclaration,
                  playMusicVibeDeclaration,
                  tellRomanticShayariDeclaration,
                  toggleHologramModeDeclaration,
                  controlMobileDeviceDeclaration,
                ],
              },
            ],
            systemInstruction: composeDynamicSystemInstruction(continuity),
          },
          callbacks: {
            onopen: () => {
              console.log('[LiveWS] Connected to Gemini Live API');
              isConnectedToGemini = true;
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'ready', model: 'gemini-3.1-flash-live-preview' }));
              }
            },
            onmessage: async (message: LiveServerMessage) => {
              if (clientWs.readyState !== WebSocket.OPEN) return;

              // Handle model audio output and text transcript
              const parts = message.serverContent?.modelTurn?.parts;
              if (parts && parts.length > 0) {
                for (const part of parts) {
                  if (part.text) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'transcript',
                        sender: 'mahi',
                        text: part.text,
                      })
                    );
                  }
                  if (part.inlineData?.data) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'audio',
                        audio: part.inlineData.data,
                      })
                    );
                  }
                }
              }

              // Handle user speech interruption
              if (message.serverContent?.interrupted) {
                console.log('[LiveWS] Interruption detected by model');
                clientWs.send(JSON.stringify({ type: 'interrupted' }));
              }

              // Handle turn complete
              if (message.serverContent?.turnComplete) {
                clientWs.send(JSON.stringify({ type: 'turn_complete' }));
              }

              // Handle function / tool calling
              if (message.toolCall) {
                const functionCalls = message.toolCall.functionCalls;
                console.log('[LiveWS] Tool call received from Gemini:', JSON.stringify(functionCalls));

                const responsesToSend: Array<{ id?: string; name?: string; response: Record<string, unknown> }> = [];

                for (const call of functionCalls || []) {
                  const callId = call.id;
                  const callName = call.name;
                  const args = (call.args || {}) as Record<string, any>;

                  // Send event to browser UI so browser can execute client-side actions
                  clientWs.send(
                    JSON.stringify({
                      type: 'tool_call',
                      callId,
                      name: callName,
                      args,
                    })
                  );

                  let toolResult: Record<string, unknown> = { success: true };

                  if (callName === 'getDeviceTime') {
                    const now = new Date();
                    toolResult = {
                      currentTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      currentDate: now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
                    };
                  } else if (callName === 'openWebsite') {
                    toolResult = {
                      status: 'opened',
                      openedUrl: args.url,
                      site: args.siteName,
                    };
                  } else if (callName === 'showLoveFeeling') {
                    toolResult = {
                      status: 'displayed',
                      heartsTriggered: true,
                      intensity: args.intensity || 95,
                    };
                  } else if (callName === 'changeThemeMood') {
                    toolResult = {
                      status: 'applied',
                      mood: args.mood,
                    };
                  } else if (callName === 'takePhotoMemory') {
                    toolResult = {
                      status: 'saved_to_memories',
                      caption: args.caption,
                      timestamp: Date.now(),
                    };
                  } else if (callName === 'setSweetReminder') {
                    toolResult = {
                      status: 'reminder_scheduled',
                      task: args.task,
                      time: args.time || 'soon',
                    };
                  } else if (callName === 'playMusicVibe') {
                    toolResult = {
                      status: 'vibe_set',
                      vibe: args.vibe,
                    };
                  } else if (callName === 'tellRomanticShayari') {
                    toolResult = {
                      status: 'shayari_displayed',
                      couplet: args.shayari,
                    };
                  } else if (callName === 'toggleHologramMode') {
                    toolResult = {
                      status: 'hologram_updated',
                      enabled: args.enabled,
                      color: args.color || 'cyan',
                    };
                  } else if (callName === 'controlMobileDevice') {
                    toolResult = {
                      status: 'executed_on_mobile',
                      action: args.action,
                      batteryLevel: `${clientTelemetry.batteryLevel}%`,
                      isCharging: clientTelemetry.batteryCharging,
                      deviceModel: clientTelemetry.deviceModel,
                      targetApp: args.appName || null,
                      targetPhone: args.phoneNumber || null,
                    };
                  }

                  responsesToSend.push({
                    id: callId,
                    name: callName,
                    response: { output: toolResult },
                  });
                }

                // Send toolResponse back to Gemini immediately
                if (responsesToSend.length > 0 && liveSession) {
                  try {
                    liveSession.sendToolResponse({
                      functionResponses: responsesToSend,
                    });
                    console.log('[LiveWS] Sent toolResponse back to Gemini');
                  } catch (e: any) {
                    console.error('[LiveWS] Failed to send tool response to Gemini:', e?.message || e);
                  }
                }
              }
            },
            onerror: (err: any) => {
              console.error('[LiveWS] Gemini Live error:', err);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: 'error',
                    error: err?.message || 'Gemini Live error',
                  })
                );
              }
            },
            onclose: (e: any) => {
              console.log('[LiveWS] Gemini Live connection closed:', e?.code, e?.reason);
              isConnectedToGemini = false;
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: 'closed',
                    code: e?.code,
                    reason: e?.reason,
                  })
                );
              }
            },
          },
        });

        liveSession = await sessionPromise;
      } catch (err: any) {
        console.error('[LiveWS] Failed to establish Gemini Live connection:', err);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(
            JSON.stringify({
              type: 'error',
              error: err?.message || 'Failed to establish Gemini Live connection',
            })
          );
        }
      }
    }

    // Initial connection to Gemini
    initGeminiSession('Aoede');

    // Handle incoming client messages
    clientWs.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'audio' && msg.audio) {
          if (liveSession && isConnectedToGemini) {
            liveSession.sendRealtimeInput({
              audio: {
                data: msg.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          }
        } else if (msg.type === 'image' && msg.image) {
          if (liveSession && isConnectedToGemini) {
            try {
              liveSession.sendRealtimeInput({
                mediaChunks: [
                  {
                    mimeType: msg.mimeType || 'image/jpeg',
                    data: msg.image,
                  },
                ],
              });
              console.log('[LiveWS] Streamed camera visual frame to Gemini Live');
            } catch (err: any) {
              console.warn('[LiveWS] Camera frame relay warning:', err?.message || err);
            }
          }
        } else if (msg.type === 'init_context') {
          const requestedVoice = msg.voice || 'Aoede';
          const requestedPersona = msg.continuity?.personaMode || 'romantic-gf';
          // Only recreate session if voice or persona differs from the already initialized session
          if (
            (!isConnectedToGemini && !sessionPromise) ||
            requestedVoice !== currentVoiceName ||
            requestedPersona !== currentPersonaMode
          ) {
            if (liveSession) {
              try {
                liveSession.close();
              } catch (_) {}
            }
            await initGeminiSession(requestedVoice, msg.continuity);
          }
        } else if ((msg.type === 'switch_voice' || msg.type === 'switch_persona') && msg.voice) {
          console.log('[LiveWS] Switching voice/persona with continuity:', msg.voice, msg.continuity?.personaMode);
          if (liveSession) {
            try {
              liveSession.close();
            } catch (_) {}
          }
          await initGeminiSession(msg.voice, msg.continuity);
        } else if (msg.type === 'device_telemetry') {
          clientTelemetry = {
            batteryLevel: typeof msg.batteryLevel === 'number' ? msg.batteryLevel : clientTelemetry.batteryLevel,
            batteryCharging: Boolean(msg.batteryCharging),
            deviceModel: msg.deviceModel || clientTelemetry.deviceModel,
          };
        } else if (msg.type === 'ping') {
          clientWs.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (err: any) {
        console.error('[LiveWS] Error parsing client message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('[LiveWS] Client disconnected');
      if (liveSession) {
        try {
          liveSession.close();
        } catch (_) {}
      }
    });

    clientWs.on('error', (err) => {
      console.error('[LiveWS] Client WS error:', err);
      if (liveSession) {
        try {
          liveSession.close();
        } catch (_) {}
      }
    });
  });

  // Production vs Development static & Vite handling
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Mahi AI] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Mahi AI] Server fatal startup error:', err);
  process.exit(1);
});
