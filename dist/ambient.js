/** A quiet, opt-in rustle, generated locally. No audio is played before a click. */
export function createAmbientSound(){
  let context,master,filter,source,oscillator,modulation,enabled=false,light=1;
  async function toggle(){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return false;
    if(!context){
      context=new Audio();master=context.createGain();master.gain.value=0;
      filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=300;
      const buffer=context.createBuffer(2,context.sampleRate*8,context.sampleRate);
      for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);let a=0,b=0;for(let i=0;i<data.length;i++){const white=Math.random()*2-1;a=.985*a+.015*white;b=.96*b+.04*white;data[i]=(a*.7+b*.3)*2.4;}}
      source=context.createBufferSource();source.buffer=buffer;source.loop=true;
      const breath=context.createGain();breath.gain.value=.72;oscillator=context.createOscillator();oscillator.frequency.value=.055;modulation=context.createGain();modulation.gain.value=.22;oscillator.connect(modulation).connect(breath.gain);source.connect(filter).connect(breath).connect(master).connect(context.destination);source.start();oscillator.start();
    }
    await context.resume();enabled=!enabled;master.gain.setTargetAtTime(enabled?.27:0,context.currentTime,.6);setLight(light);return enabled;
  }
  function setLight(value){light=value;if(filter)filter.frequency.setTargetAtTime(620-value*330,context.currentTime,2);}
  function pause(){if(context&&enabled)master.gain.setTargetAtTime(0,context.currentTime,.15);}
  function resume(){if(context&&enabled)master.gain.setTargetAtTime(.27,context.currentTime,.5);}
  return {toggle,setLight,pause,resume,get enabled(){return enabled;}};
}
