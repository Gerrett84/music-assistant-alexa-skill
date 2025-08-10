/* *
 * This sample demonstrates handling intents for an Alexa skill implementing the AudioPlayer interface using the Alexa Skills Kit SDK (v2).
 * This sample works using the default DynamoDB table associated with an Alexa-hosted skill - you will need to use this with a hosted skill,
 * or you use your own DynamoDB table in the request and response interceptors.
 * Please visit https://github.com/alexa-samples for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const Util = require('./util.js');
const https = require('https');

// Define global variables for hostnames
const API_HOSTNAME = '<DEFINE-YOUR-API-HOSTNAME-HERE>'; // Replace with your API hostname
const MA_HOSTNAME  = '<DEFINE-YOUR-MA-HOSTNAME-HERE>';  // Replace with your Music Assistant hostname
const API_USERNAME = undefined; //Replace with your username
const API_PASSWORD = undefined; //Replace with your password

function getLatestUrl() {
    return new Promise((resolve, reject) => {
        const headers = {};

        if (API_USERNAME !== undefined && API_PASSWORD !== undefined) {
            const auth = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
        }

        const options = {
            hostname: API_HOSTNAME,
            path: '/ma/latest-url',
            method: 'GET',
            headers: headers,
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ json: () => Promise.resolve(json) });
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Willkommen, du kannst sagen „Musik abspielen“, um die Wiedergabe zu starten. Was möchtest du tun?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const PlayAudioIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayAudioIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ResumeIntent');
    },
    async handle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);

        let apiResponse, obj, streamUrl, metadata;
        try {
            apiResponse = await getLatestUrl();
            obj = await apiResponse.json();
            streamUrl = obj.streamUrl.replace(/^.*(?=\/flow\/)/, `https://${MA_HOSTNAME}`);
            metadata = {
              title: obj.title,
              subtitle: obj.title,
              art: {
                  sources: [
                      {
                          url: obj.imageUrl,
                      }
                  ]
              },
              backgroundImage: {
                  sources: [
                      {
                          url: obj.imageUrl,
                      }
                  ]
              }
            };
        } catch (error) {
            console.error('Error fetching latest URL:', error);
            const speakOutput = 'Entschuldigung, ich konnte den neuesten Musik-Stream nicht von der API abrufen. Bitte überprüfe deine Einrichtung.';
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        }

        const speakOutput = '';
        const playBehavior = 'REPLACE_ALL';
        const podcastUrl = streamUrl;
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .addAudioPlayerPlayDirective(
                playBehavior,
                podcastUrl,
                playbackInfo.token,
                playbackInfo.offsetInMilliseconds
                )
            .getResponse();
    }
};

const PauseAudioIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PauseIntent';
    },
    async handle(handlerInput) {
        return handlerInput.responseBuilder
            .addAudioPlayerStopDirective()
            .getResponse();
    }
};

const UnsupportedAudioIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOffIntent'
                    || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOnIntent'
                    || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NextIntent'
                    || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PreviousIntent'
                    || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.RepeatIntent'
                    || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ShuffleOffIntent'
                    || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ShuffleOnIntent'
                    || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StartOverIntent'
                );
    },
    async handle(handlerInput) {
        const speakOutput = 'Entschuldigung, das kann ich noch nicht unterstützen.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Du kannst sagen „Musik abspielen“, um die Wiedergabe zu starten. Wie kann ich dir helfen?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Auf Wiedersehen!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const AudioPlayerEventHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type.startsWith('AudioPlayer.');
  },
  async handle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    
    const audioPlayerEventName = handlerInput.requestEnvelope.request.type.split('.')[1];
    console.log(`AudioPlayer event encountered: ${handlerInput.requestEnvelope.request.type}`);
    let returnResponseFlag = false;
    switch (audioPlayerEventName) {
      case 'PlaybackStarted':
        playbackInfo.token = handlerInput.requestEnvelope.request.token;
        playbackInfo.inPlaybackSession = true;
        playbackInfo.hasPreviousPlaybackSession = true;
        returnResponseFlag = true;
        break;
      case 'PlaybackFinished':
        playbackInfo.inPlaybackSession = false;
        playbackInfo.hasPreviousPlaybackSession = false;
        playbackInfo.nextStreamEnqueued = false;
        returnResponseFlag = true;
        break;
      case 'PlaybackStopped':
        playbackInfo.token = handlerInput.requestEnvelope.request.token;
        playbackInfo.inPlaybackSession = true;
        playbackInfo.offsetInMilliseconds = handlerInput.requestEnvelope.request.offsetInMilliseconds;
        break;
      case 'PlaybackNearlyFinished':
        break;
      case 'PlaybackFailed':
        playbackInfo.inPlaybackSession = false;
        console.log('Playback Failed : %j', handlerInput.requestEnvelope.request.error);
        break;
      default:
        break;
    }
    setPlaybackInfo(handlerInput, playbackInfo);
    return handlerInput.responseBuilder.getResponse();
  },
};

const PlaybackControllerHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type.startsWith('PlaybackController.');
  },
  async handle(handlerInput) {
    let apiResponse, obj, streamUrl, metadata;
    try {
        apiResponse = await getLatestUrl();
        obj = await apiResponse.json();
        streamUrl = obj.streamUrl.replace(/^.*(?=\/flow\/)/, `https://${MA_HOSTNAME}`);
        metadata = {
          title: obj.title,
          subtitle: obj.title,
          art: {
              sources: [
                  {
                      url: obj.imageUrl,
                  }
              ]
          },
          backgroundImage: {
              sources: [
                  {
                      url: obj.imageUrl,
                  }
              ]
          }
        };
    } catch (error) {
        console.error('Error fetching latest URL:', error);
        const speakOutput = 'Entschuldigung, ich konnte den neuesten Musik-Stream nicht von der API abrufen. Bitte überprüfe deine Einrichtung.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }

    const playbackInfo = await getPlaybackInfo(handlerInput);
    const playBehavior = 'REPLACE_ALL';
    const podcastUrl = streamUrl;
    const playbackControllerEventName = handlerInput.requestEnvelope.request.type.split('.')[1];
    let response;
    switch (playbackControllerEventName) {
      case 'PlayCommandIssued':
        response = handlerInput.responseBuilder
            .addAudioPlayerPlayDirective(
                playBehavior,
                podcastUrl,
                playbackInfo.token,
                playbackInfo.offsetInMilliseconds,
                metadata
                )
            .getResponse();
        break;
      case 'PauseCommandIssued':
        response = handlerInput.responseBuilder
            .addAudioPlayerStopDirective()
            .getResponse();
        break;
      default:
        break;
    }
    setPlaybackInfo(handlerInput, playbackInfo);

    console.log(`PlayCommandIssued event encountered: ${handlerInput.requestEnvelope.request.type}`);
    return response;
  },
};

const SystemExceptionHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'System.ExceptionEncountered';
  },
  handle(handlerInput) {
    console.log(`System exception encountered: ${JSON.stringify(handlerInput.requestEnvelope.request)}`);
  },
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Entschuldigung, das weiß ich nicht. Bitte versuche es noch einmal.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `Du hast gerade ${intentName} ausgelöst`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Entschuldigung, ich hatte Probleme beim Ausführen deiner Anfrage. Bitte versuche es erneut.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/* HELPER FUNCTIONS */

async function getPlaybackInfo(handlerInput) {
  const attributes = await handlerInput.attributesManager.getPersistentAttributes();
  return attributes.playbackInfo;
}

async function setPlaybackInfo(handlerInput, playbackInfoObject) {
  await handlerInput.attributesManager.setPersistentAttributes({
      playbackInfo: playbackInfoObject
      });
}

const LoadPersistentAttributesRequestInterceptor = {
  async process(handlerInput) {
    const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes();

    if (Object.keys(persistentAttributes).length === 0) {
      handlerInput.attributesManager.setPersistentAttributes({
        playbackInfo: {
          offsetInMilliseconds: 0,
          token: 'sample-audio-token',
          inPlaybackSession: false,
          hasPreviousPlaybackSession: false,
        },
      });
    }
  },
};

const SavePersistentAttributesResponseInterceptor = {
  async process(handlerInput) {
    await handlerInput.attributesManager.savePersistentAttributes();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        PlayAudioIntentHandler,
        PauseAudioIntentHandler,
        UnsupportedAudioIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        AudioPlayerEventHandler,
        PlaybackControllerHandler,
        SystemExceptionHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .addRequestInterceptors(LoadPersistentAttributesRequestInterceptor)
    .addResponseInterceptors(SavePersistentAttributesResponseInterceptor)
    .withCustomUserAgent('sample/audioplayer-nodejs/v2.0')
    .withPersistenceAdapter(
        new ddbAdapter.DynamoDbPersistenceAdapter({
            tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
            createTable: false,
            dynamoDBClient: new AWS.DynamoDB({apiVersion: 'latest', region: process.env.DYNAMODB_PERSISTENCE_REGION})
        })
    )
    .lambda();