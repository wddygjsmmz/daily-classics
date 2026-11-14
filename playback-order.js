// Playlist navigation independent of media loading. Shuffle uses a bag per round.
(function(root){
 class PlaybackOrder {
  constructor(random=Math.random){this.random=random;this.mode='sequence';this.reset(0)}
  reset(length){this.length=length;this.bag=[];this.history=[];this.cursor=-1}
  setMode(mode,current){this.mode=['sequence','list','single','shuffle'].includes(mode)?mode:'sequence';this.bag=[];this.history=current>=0?[current]:[];this.cursor=this.history.length-1}
  shuffled(current){
   if(this.length===1)return 0;
   if(!this.bag.length){
    this.bag=Array.from({length:this.length},(_,i)=>i).filter(i=>i!==current);
    for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]]}
   }
   return this.bag.pop();
  }
  start(){if(!this.length)return -1;const p=this.mode==='shuffle'?Math.floor(this.random()*this.length):0;this.history=[p];this.cursor=0;return p}
  next(current,automatic=false){
   if(!this.length)return -1;
   if(automatic&&this.mode==='single')return current;
   if(this.mode==='shuffle'){
    if(this.cursor+1<this.history.length)return this.history[++this.cursor];
    const p=this.shuffled(current);this.history.push(p);this.cursor++;return p;
   }
   if(current+1<this.length)return current+1;
   return this.mode==='sequence'?-1:0;
  }
  previous(current){
   if(!this.length)return -1;
   if(this.mode==='shuffle')return this.cursor>0?this.history[--this.cursor]:-1;
   return current>0?current-1:this.mode==='sequence'?-1:this.length-1;
  }
  canPrevious(current){return this.mode==='shuffle'?this.cursor>0:this.length>0&&(current>0||this.mode!=='sequence')}
  canNext(current){return this.length>0&&(this.mode!=='sequence'||current+1<this.length)}
 }
 root.PlaybackOrder=PlaybackOrder;
})(typeof module==='object'?module.exports:window);
