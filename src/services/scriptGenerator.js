// Generates personalised sleep scripts based on user's onboarding answers
// Uses templates for now — swap in OpenAI API once key is available

const SCRIPTS = {
  stress: {
    calm_female: `Close your eyes and take a slow, deep breath in through your nose. Hold it gently... and release through your mouth. With each breath out, feel the weight of today beginning to lift from your shoulders. You did enough today. You are enough. Whatever is waiting for tomorrow can wait until morning. Right now, the only thing that exists is this moment, this breath, this quiet. Your mind has been working hard. It is allowed to rest now. Picture a warm, amber light beginning at the crown of your head, moving slowly downward. As it passes through your forehead, your jaw unclenches. Your eyes soften. The amber warmth moves through your throat, your chest, your belly. Everywhere it touches becomes heavy and still. You are safe. You are held. The thoughts that visit you tonight are just clouds passing across a dark sky — you can see them, but you do not have to follow them. Let them drift. Let them go. Your only task right now is to breathe... and let the night carry you somewhere restful and deep.`,

    calm_male: `Take a long, slow breath in. Feel your chest and belly rise. And let it go, completely. There is nothing you need to do right now. Nowhere you need to be. The day is finished, and it will still be there in the morning. But for now, it is done. Notice your body against the mattress. Feel the weight of your arms, your legs, your back sinking deeper with every breath. You are allowed to be heavy tonight. Starting from your feet — let them go completely. Ankles. Calves. The back of your knees. A wave of relaxation moving upward, slow and steady. Your thighs release. Your hips settle. Your lower back softens into the bed beneath you. You are safe. Whatever was difficult today has passed. The night is yours now. Just breathing. Just resting. Let sleep find you.`,

    whisper: `Breathe in... and out. In... and out. Let your body remember what it already knows how to do. You don't need to try to sleep. Sleep is already coming for you. Your eyes are heavy. Your thoughts are slowing down, like the last few pages of a book before you set it down for the night. Let the sounds around you become part of the background, soft and distant. Let this voice become softer too, blending into the quiet. You are drifting now. Warm, slow, and safe. There is nothing left to hold onto tonight. Let go.`
  },

  racing_thoughts: {
    calm_female: `Your mind has been busy today — full of thoughts, ideas, things to remember, things to solve. That's okay. That's what minds do. But right now, we're going to give it something simple to focus on. Just your breath. In... and out. Every time a thought appears, and thoughts will appear, just notice it without judgment, and gently come back to your breath. In... and out. You don't need to solve anything tonight. The answers you need will be clearer in the morning after rest. Your mind is like a snowglobe that has been shaken all day. We're just letting it settle now. The snowflakes are slowing. The water is becoming still. In... and out. You are doing beautifully. Keep breathing.`,

    calm_male: `Let your thoughts come. Don't fight them. Just watch them the way you'd watch cars passing on a quiet street from behind a window. They arrive, they pass, they're gone. You don't need to chase any of them. In through your nose, slow and steady. Out through your mouth. Again. Your job right now is just this — breathing and noticing. Not fixing. Not planning. Not solving. Just here, in this bed, in this moment. Each breath out, your thinking slows just a little more. The gaps between thoughts grow longer. The night gets quieter. Keep breathing.`,

    whisper: `Thoughts are just thoughts. They are not urgent. They will still be there tomorrow. Right now, there is only this breath. In... and out. In... and out. Notice the softness beneath you. The weight of your blanket. The temperature of the air on your face. These are real. These are now. Come back here whenever a thought tries to pull you away. You are here. You are safe. You are already resting.`
  },

  physical_tension: {
    calm_female: `Start with your feet. Curl your toes gently, hold for just a moment... and let them go completely. Feel the release travel up into your ankles. Now tense your calves, just lightly... and release. Let that wave of softness move upward. Your knees, your thighs — tighten and let go. Your hips and the small of your back — breathe into any tightness you find there, and breathe it out. Your belly — rise on the inhale, fall on the exhale. Your chest — open and release. Your shoulders — draw them up toward your ears... and drop them down. Feel how heavy they are now. Your arms fall open. Your hands uncurl. Your jaw softens. Your face becomes smooth. From your feet to the top of your head, you are released. You are resting. You are free to sleep now.`,

    calm_male: `We're going to work through your body together. Start at the bottom and work up. Your feet — let them fall open, completely relaxed. Calves — soft. Knees — heavy. Thighs — released. With each breath out, your body melts a little more into the surface beneath you. Hips and lower back — give your weight to the bed, it will hold you. Stomach — soft on the exhale. Chest — open and wide. Shoulders — fall back and down. Arms — heavy, still. Hands — open. Neck — long and easy. Face — smooth. You are fully released now. Nothing to hold. Nothing to carry. Just rest.`,

    whisper: `Soften your jaw. Let your tongue fall away from the roof of your mouth. Soften behind your eyes. Feel your whole face become still. Your neck is long. Your shoulders are low. Everything below you holds your weight so you don't have to. You can let go completely now. Your body knows how to rest. Trust it.`
  },

  noise: {
    calm_female: `Let the sounds around you become part of your rest rather than apart from it. Every sound you hear — near or far — is simply part of the world moving on without needing anything from you. You are separate from it, cocooned in your own quiet space. Focus instead on the sound of your breathing. The gentle rhythm that has been with you your whole life. In... and out. Steady and slow. Let that rhythm become the loudest thing in your awareness. Everything else is background. Everything else is distant. You are here, breathing, resting, safe. The world outside can have its sounds. This space — your space — is still.`,

    calm_male: `Notice the sounds, acknowledge them, and let them pass. They don't need your attention. They don't need a response. You are safe, and nothing you're hearing requires anything of you. Bring your focus back to your body. Feel the bed beneath you. Feel your chest rise and fall. This physical experience — weight, warmth, breath — is real and present and yours. Come back to it whenever the sounds try to pull you away. In... and out. In... and out. You are here. You are resting. The night is doing what nights do.`,

    whisper: `You don't have to block out the sounds. Just let them pass through, like wind through an open window. They are not yours to carry. Your body is heavy and warm. Your breath is slow. That is all that matters right now. In... and out. You are drifting.`
  }
};

function generateScript(sleepBlocker, voicePreference) {
  const blockerScripts = SCRIPTS[sleepBlocker] || SCRIPTS.stress;
  const script = blockerScripts[voicePreference] || blockerScripts.calm_female;
  return script;
}

module.exports = { generateScript };
