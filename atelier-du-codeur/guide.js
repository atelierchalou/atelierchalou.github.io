/* Mode guidé : l'élève suit un parcours de missions. Pour chaque mission : consigne, boîte à outils réduite aux blocs utiles,
   indices, vérification automatique dans le simulateur, étoiles et progression enregistrée.
   Le programme « libre » de l'élève est mis de côté pendant le mode guidé, puis rendu à la sortie. */
(function (root) {
  'use strict';

  const CSS = `
.guide{margin:10px 14px 0;border-radius:18px;background:linear-gradient(135deg,#e9fbf4,#eef3ff);border:3px solid #b9ead6;padding:10px 12px;display:flex;flex-direction:column;gap:7px;flex:none}
.guide[hidden]{display:none}
.ghead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ghead .gnum{font-weight:600;font-size:12.5px;color:#1a8f4e;text-transform:uppercase;letter-spacing:.04em}
.gdots{display:flex;gap:5px;margin-left:auto}
.gdots button{width:22px;height:22px;border-radius:50%;border:2px solid #9fd8bd;background:#fff;font:600 11px var(--font);color:#5d7a6c;cursor:pointer;padding:0}
.gdots button.lock{background:#f1f2f6;border-color:#d5d9e4;color:#9aa1b3;cursor:not-allowed;font-size:10px}
.gdots button.done{background:#34B34A;border-color:#34B34A;color:#fff}
.gdots button.cur{outline:3px solid #FFC933;outline-offset:1px}
.gtitle{font-size:17px;font-weight:600;color:#0b6e75;margin:0}
.gcourses{display:grid;grid-template-columns:1fr;gap:7px}
.glevel{margin:8px 2px 0;font:700 13px var(--font);text-transform:uppercase;letter-spacing:.06em;color:#7a5a00}
.glevel:first-child{margin-top:0}
.gcourse{display:flex;align-items:center;gap:10px;text-align:left;font:inherit;background:#fff;border:2px solid #cfe9dc;border-radius:14px;padding:8px 10px;cursor:pointer;color:var(--ink)}
.gcourse:hover,.gcourse:focus-visible{border-color:#34B34A;background:#f4fcf7;outline:none}
.gcourse.finished{border-color:#34B34A}
.gcicon{font-size:26px;width:38px;text-align:center;flex:none}
.gctext{display:flex;flex-direction:column;gap:1px}
.gctext b{font-size:14.5px;color:#0b6e75} .gctext small{font-size:12.5px;color:var(--muted)} .gctext em{font-style:normal;font-size:12px;color:#1a6f3e;font-weight:600}
.gcaption{margin:6px 0 0;background:rgba(20,33,61,.9);color:#fff;font:600 13.5px/1.35 var(--font);border-radius:10px;padding:6px 10px;text-align:center}
.gcaption[hidden]{display:none}
/* consignes dans le bandeau (mode guidé) */
.guide.gbar{position:relative;margin:0;flex:1 1 560px;min-width:0;flex-direction:row;align-items:center;gap:14px;padding:0;border:0;border-radius:0;color:var(--ink);background:none}
.gbar .gmain{flex:0 1 auto;min-width:0;display:flex;flex-direction:column;gap:3px;background:linear-gradient(135deg,#f4fffa,#f1f5ff);border:2px solid #b9ead6;border-radius:16px;padding:5px 12px 5px 8px;box-shadow:0 3px 0 rgba(0,0,0,.12)}
.gbar .ghead{gap:6px;flex-wrap:nowrap}
.gbar .ghead .gnum{font-size:11px;white-space:nowrap}
.gbar .gdots{margin-left:4px;gap:3px;flex-wrap:nowrap}
.gbar .gdots button{width:18px;height:18px;font-size:9.5px;flex:none}
.gbar .gline{display:flex;align-items:center;gap:8px;min-width:0}
.gbar .gtitle{font-size:14.5px;line-height:1.2;flex:0 1 auto;max-width:190px}
.gbar .gmain{overflow:hidden}
.gbar .gsay{flex:1;min-width:0;gap:6px}
.gbar .gbubble{flex:none;max-width:100%;box-sizing:border-box}
.gbar .gsay .gmascot{width:54px;height:58px}
.gbar .gbubble{font-size:13.5px;line-height:1.3;padding:4px 10px;border-width:2px;border-radius:12px}
.gbar .gbubble::before{left:-8px;margin-top:-6px;border-width:6px}
.gbar .gside{margin-left:auto;flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.gbar .gside{flex-direction:row;align-items:center;gap:10px}
.gbar .gsmall{flex-direction:column;align-items:stretch;gap:4px}
.gbar .gsmall:not(:has(.gbtn:not([hidden]))){display:none}
.gbar .gpushes{flex-wrap:nowrap;gap:10px;max-width:none}
.gbtn.gpush{flex-direction:column;gap:7px;background:none;box-shadow:none;padding:0;border-radius:0;color:#14213d;font:700 11.5px/1.1 var(--font);min-width:54px}
.gpush .cap{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font:800 21px/1 var(--font);color:#fff;border:3px solid #fff;
  background:radial-gradient(circle at 35% 28%,#8ff09c,#34B34A 58%,#1f7d35);box-shadow:0 5px 0 #17602a,0 7px 10px rgba(0,0,0,.25),inset 0 -4px 6px rgba(0,0,0,.22),inset 0 3px 5px rgba(255,255,255,.55);transition:transform .07s,box-shadow .07s}
.gpush.hint .cap{background:radial-gradient(circle at 35% 28%,#ffe58a,#FFC933 58%,#d89a00);box-shadow:0 5px 0 #a87800,0 7px 10px rgba(0,0,0,.25),inset 0 -4px 6px rgba(0,0,0,.2),inset 0 3px 5px rgba(255,255,255,.6)}
.gpush.gmore .cap{font-family:Georgia,serif;font-style:italic;background:radial-gradient(circle at 35% 28%,#9cc2ff,#3D7BFF 58%,#1f4fc2);box-shadow:0 5px 0 #173c96,0 7px 10px rgba(0,0,0,.25),inset 0 -4px 6px rgba(0,0,0,.22),inset 0 3px 5px rgba(255,255,255,.55)}
.gpush:hover .cap{filter:brightness(1.06)}
.gpush:active .cap,.gpush.gmore.on .cap{transform:translateY(4px);box-shadow:0 1px 0 rgba(0,0,0,.35),inset 0 -2px 5px rgba(0,0,0,.25),inset 0 3px 5px rgba(255,255,255,.4)}
.gpush:active{transform:none}
.gbtn.gpush.hint,.gbtn.gpush.light{background:none;box-shadow:none;color:#14213d}
.gbar .gline>.gpush{flex:none;margin-left:2px}
.gbar .gpushes .gpush .lab{max-width:84px;text-align:center;line-height:1.1}
.gbar .gline>.gpush .lab{color:#1f4fc2;text-shadow:none;max-width:84px;text-align:center;line-height:1.1}
.gmini .lab{max-width:70px;text-align:center;line-height:1.1}
.gpush:focus-visible{outline:none}.gpush:focus-visible .cap{outline:3px solid #FFC933;outline-offset:2px}
.gpush:disabled .cap{filter:grayscale(.5) brightness(.9)}
.gmore.on{background:none;color:#14213d}
/* mascotte et titre de la mission : dans l'espace des blocs, SOUS les blocs (le fond de Blockly est transparent) */
#blocklyDiv{position:relative}
#blocklyDiv>.injectionDiv{position:relative;z-index:1}
.gunder{position:absolute;z-index:0;pointer-events:none}
body.guided #blocklyDiv>.buddy{position:absolute;z-index:0;bottom:16px;right:92px;margin:0;max-width:min(360px,34vw);pointer-events:none;filter:drop-shadow(0 6px 14px rgba(20,30,70,.18))}
.gmtitle{bottom:18px;text-align:center;font:700 clamp(22px,2.6vw,36px)/1.1 var(--font);color:rgba(11,110,117,.32);letter-spacing:.01em;text-shadow:0 2px 0 rgba(255,255,255,.8)}
.gmtitle small{display:block;font-size:.45em;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(11,110,117,.32)}
.gmtitle[hidden]{display:none}
.gmtitle.blink5{animation:gmblink 1s ease-in-out 5}
@keyframes gmblink{0%,100%{color:rgba(11,110,117,.32)}50%{color:#0b6e75;text-shadow:0 0 18px rgba(255,201,51,.95),0 2px 0 #fff;transform:scale(1.04)}}
.gbar:not(.gfin) .gline>.gtitle{display:none}   /* le titre n'est plus à côté de la mascotte : il est en bas de la zone des blocs */
/* les gros boutons scintillent de temps en temps */
.gpush .cap{position:relative;overflow:hidden}
.gpush .cap::after{content:'';position:absolute;inset:-30%;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.85) 50%,transparent 60%);transform:translateX(-120%);animation:gshine 7.5s ease-in-out infinite;pointer-events:none}
.gpush.hint .cap::after{animation-delay:2.5s}.gpush.gmore .cap::after{animation-delay:5s}
@keyframes gshine{0%,8%{transform:translateX(-120%)}16%,100%{transform:translateX(120%)}}
.gpush .cap::before{content:'✦';position:absolute;top:2px;right:4px;font:400 11px/1 sans-serif;color:#fff;opacity:0;animation:gstar 7.5s ease-in-out infinite;text-shadow:0 0 6px #fff}
.gpush.hint .cap::before{animation-delay:2.5s}.gpush.gmore .cap::before{animation-delay:5s}
@keyframes gstar{0%,10%{opacity:0;transform:scale(.3) rotate(0)}15%{opacity:1;transform:scale(1.3) rotate(45deg)}22%,100%{opacity:0;transform:scale(.3) rotate(90deg)}}
@media (prefers-reduced-motion: reduce){.gpush .cap::after,.gpush .cap::before,.gmtitle.blink5{animation:none}}
body.guided .buddy .mascot{width:64px;height:66px}
.gscore{display:block;margin-top:4px;color:#1a6f3e;font-size:14px}
body.guided .buddy #bubble{display:none}   /* en mode guidé, la mascotte du bas ne dit que le score */
.gscorebubble{flex:none;font-weight:700;font-size:15px;color:#1a6f3e;white-space:nowrap}
body:not(.guided) .gscorebubble{display:none}
.gbar .gpush .lab{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.45)}
.guide.gbar.gfin{background:linear-gradient(135deg,#f4fffa,#f1f5ff);border:2px solid #b9ead6;border-radius:16px;padding:6px 12px}
.gbar .gbtns{flex:none;flex-wrap:wrap;justify-content:flex-end;max-width:330px;gap:5px}
.gprog{margin:8px 14px 0;padding:6px 10px;border-radius:14px;background:linear-gradient(135deg,#e9fbf4,#eef3ff);border:2px solid #b9ead6}
.gprog[hidden]{display:none}
.gprog .ghead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gprog .gnum{font-weight:700;font-size:12.5px;color:#1a8f4e;text-transform:none;letter-spacing:0}
.gprog .ghead{flex-wrap:nowrap}
.gprog .gdots{margin-left:auto;gap:3px;flex-wrap:nowrap}
.gprog .gdots button{width:20px;height:20px;font-size:10px;flex:none}
.gprog .gnum{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
body.guided header .spacer{display:none}
.gbar .gbtn{padding:5px 10px;font-size:12.5px}
.gpop{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:960;width:min(720px,92vw);max-height:84vh;overflow:auto;background:#fff;color:var(--ink);border:3px solid #b9ead6;border-radius:24px;box-shadow:0 24px 70px rgba(10,20,60,.4);padding:18px 22px;display:flex;flex-direction:column;gap:10px;font-size:15px}
.gpop .gexp{font-size:15px}.gpop .gcrit{font-size:15px}.gpop .gbareme{font-size:13.5px}
.gpopback{position:fixed;inset:0;z-index:950;background:rgba(15,20,45,.45);cursor:pointer}
.gpopback[hidden]{display:none}
.gmini{flex:none;display:inline-flex;flex-direction:column;align-items:center;gap:4px;margin-right:6px}
.gmini .cap{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font:italic 800 17px/1 Georgia,serif;color:#fff;border:2px solid #fff;
  background:radial-gradient(circle at 35% 28%,#9cc2ff,#3D7BFF 58%,#1f4fc2);box-shadow:0 4px 0 #173c96,inset 0 -3px 5px rgba(0,0,0,.22),inset 0 2px 4px rgba(255,255,255,.55);animation:gminipush 1.6s ease-in-out infinite}
.gmini .lab{font:700 10.5px var(--font);color:#1f4fc2}
@keyframes gminipush{0%,55%,100%{transform:none;box-shadow:0 4px 0 #173c96,inset 0 -3px 5px rgba(0,0,0,.22),inset 0 2px 4px rgba(255,255,255,.55)}65%,80%{transform:translateY(3px);box-shadow:0 1px 0 #173c96,inset 0 -2px 4px rgba(0,0,0,.25)}}
.gmini::after{content:'👆';position:absolute;top:18px;left:22px;font-size:18px;animation:gminifinger 1.6s ease-in-out infinite}
.gmini{position:relative}
@keyframes gminifinger{0%,45%,100%{transform:translate(4px,6px)}60%,80%{transform:translate(0,0)}}
@media (prefers-reduced-motion: reduce){.gmini .cap,.gmini::after{animation:none}}
.gpop[hidden]{display:none}
.gpopnote{display:flex;align-items:center;gap:8px;background:#eef4ff;border-radius:14px;padding:10px 40px 12px 12px;font-size:14px;color:#34405a;position:relative}
.gpopnote b{color:#1f4fc2}
.gpopclose{position:absolute;right:6px;top:4px;border:0;background:#fff;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:12px;color:#34405a;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.gpop .gexp p{margin:2px 0 0}
.gpop .gexp b,.gpoph{color:#0b6e75;font-size:13px}
.guide.gpick{position:fixed;z-index:900;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,94vw);max-height:88vh;overflow:auto;margin:0;box-shadow:0 0 0 100vmax rgba(15,20,45,.45),0 20px 60px rgba(0,0,0,.35);color:var(--ink)}
body.guided header h1{display:none}
@media (min-width:1700px){body.guided header h1{display:block}}
.gstage{position:fixed;inset:0;z-index:1000;background:rgba(20,24,52,.55);display:flex;align-items:center;justify-content:center;padding:16px;animation:gfade .2s ease-out}
@keyframes gfade{from{opacity:0}to{opacity:1}}
.gstage-card{background:#fff;border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.35);width:min(900px,96vw);max-height:94vh;overflow:auto;padding:14px 18px;display:flex;flex-direction:column;gap:10px;animation:gpop .25s ease-out}
@keyframes gpop{from{transform:scale(.92)}to{transform:none}}
.gstage-head b{font-size:18px;color:#0b6e75}
.gstage-status{margin:4px 0 0;font-size:16px;font-weight:600;border-radius:12px;padding:8px 12px;background:#fff9e6;color:#7a5a00}
.gstage-status.ok{background:#eafaf0;color:#1a6f3e} .gstage-status.ko{background:#fff0f4;color:#a3203f}
.gstage-sim #simPanel{margin:0 !important;overflow:visible;flex:none;min-height:0}
.gstage-sim{pointer-events:none;user-select:none}   /* pendant la vérification, c'est le test qui appuie sur les boutons : pas de clic de l'élève */
.gstage-sim .simbar{display:none !important}
.gstage.robot .robotcanvas{max-width:calc((94vh - 312px) * 1.5);margin:0 auto}
.gstage .robotcap{position:static;margin:0 auto 6px;max-width:calc((94vh - 312px) * 1.5)}   /* la légende du test ne cache plus le haut du terrain */
.gstage .robotcap[hidden]{display:none}
.gstage-sim .serialhead,.gstage-sim .serial,.gstage-sim .simhint{display:none !important}
.gstage.robot .boardbox{display:none}
.gstage:not(.robot) .gstage-sim{zoom:1.25}
.gstage-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px}
.gstage-foot:empty{display:none}
.gstage-btn{font-size:19px;padding:12px 26px}
.gstage-btn.light{font-size:15px;padding:9px 16px}
.gstage-info{flex-basis:100%}
.gstage-pts{flex-basis:100%;text-align:center;font-size:22px;font-weight:600;color:#1a8f4e}
body .confetti{z-index:2000}
.gbilan-card{width:min(760px,96vw)}
.gnote{display:flex;align-items:baseline;justify-content:center;gap:6px;color:#1a8f4e;font-weight:600}
.gnote span{font-size:56px;line-height:1} .gnote small{font-size:22px}
.gnote-sub{text-align:center;margin:0;font-weight:600;color:#0b6e75}
.gnote-sub.glost{margin-top:8px;color:#a0581a}
.gbilan{width:100%;border-collapse:collapse;font-size:14px}
.gbilan th{text-align:left;background:#e9fbf4;color:#0b6e75;padding:6px 8px}
.gbilan td{padding:6px 8px;border-top:1px solid #e3e8f4}
.gbilan tr.ok td:nth-child(3){color:#1a8f4e;font-weight:600} .gbilan tr.ko td:nth-child(3){color:#a3203f;font-weight:600} .gbilan tr.sol td:nth-child(3){color:#a05a00;font-weight:600}
.gname{font:600 16px var(--font);border:2px solid #cfd6ee;border-radius:999px;padding:10px 16px;min-width:240px}
.gname:focus{outline:none;border-color:#3D7BFF}
.gbtn:disabled{opacity:.5;cursor:not-allowed}
.gmenu{position:fixed;z-index:600;background:#fff;color:var(--ink);border-radius:16px;padding:6px;min-width:240px;box-shadow:0 12px 30px rgba(30,20,80,.25);display:flex;flex-direction:column}
.gmenu button{font:600 14px var(--font);text-align:left;border:0;background:transparent;border-radius:10px;padding:9px 12px;cursor:pointer;color:var(--ink)}
.gmenu button:hover,.gmenu button:focus-visible{background:#f1ecff;outline:none}
.gsay{display:flex;align-items:center;gap:8px}
.gsay .gmascot{width:58px;height:62px;flex:none;overflow:visible}
.gbubble{position:relative;flex:1;background:#fff;border:3px solid #9fd8bd;border-radius:16px;padding:8px 12px;font-size:14.5px;line-height:1.4}
.gbubble::before{content:'';position:absolute;left:-11px;top:50%;margin-top:-8px;border:8px solid transparent;border-right-color:#9fd8bd;border-left:0}
.gbtn.next.blink{animation:gblink 1.1s ease-in-out infinite}
@keyframes gblink{0%,100%{transform:scale(1);box-shadow:0 3px 0 #2a56bd,0 0 0 0 rgba(61,123,255,.6)}50%{transform:scale(1.07);box-shadow:0 3px 0 #2a56bd,0 0 0 9px rgba(61,123,255,0);filter:brightness(1.15)}}
@media (prefers-reduced-motion: reduce){.gbtn.next.blink{animation:none;outline:3px solid #FFC933}}
.ggoal{font-size:14px;margin:0}
.gexp{font-size:13px;color:var(--muted);margin:0}
.gcrit{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px;font-size:13px}
.gcrit li::before{content:'○';display:inline-block;width:18px;color:#9aa5b1;font-weight:600}
.gcrit li.ok::before{content:'✔';color:#1a8f4e} .gcrit li.ko::before{content:'✘';color:#d6335a}
.gbtns{display:flex;flex-wrap:wrap;gap:6px}
.gbtn{display:inline-flex;align-items:center;gap:5px;font:600 13.5px var(--font);border:0;border-radius:999px;padding:7px 13px;cursor:pointer;color:#fff;background:#34B34A;box-shadow:0 3px 0 #23803a}
.gbtn:active{transform:translateY(2px);box-shadow:none}
.gbtn:disabled{opacity:.6;cursor:wait}
.gbtn[hidden]{display:none}
body.guided .simwrap{flex:none;min-height:300px;overflow:visible}
body.guided #log{height:56px}
.gexp summary{cursor:pointer;color:#0b6e75;font-weight:600}
.gbtn.hint{background:#FFC933;color:#3a2a00;box-shadow:0 3px 0 #d9a100}
.gbtn.light{background:#fff;color:var(--ink);box-shadow:0 3px 0 #cfd6ee}
.gbtn.next{background:#3D7BFF;box-shadow:0 3px 0 #2a56bd}
.ghint{display:flex;flex-direction:column;gap:8px}
.ghitem{background:#fff8e1;border:3px solid #ffd666;border-radius:16px;padding:10px 14px;font-size:18px;line-height:1.4;color:#3a2a00;box-shadow:0 3px 0 #f0c040}
.ghitem .ghlab{display:block;font-weight:700;font-size:14px;color:#a87800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px}
.ghitem b{color:#7a4d00}
.gwarn{position:fixed;inset:0;z-index:1200;background:rgba(15,20,45,.5);display:flex;align-items:center;justify-content:center;padding:16px;animation:gfade .2s ease-out}
.gwarn-card{background:#fff;border-radius:22px;border:3px solid #ffd666;box-shadow:0 20px 60px rgba(0,0,0,.35);width:min(480px,94vw);padding:18px 22px;text-align:center;animation:gpop .25s ease-out}
.gwarn-ico{font-size:40px;line-height:1}
.gwarn-card p{font-size:16.5px;line-height:1.45;margin:10px 0 16px;color:#14213d}
.gwarn-card p b{color:#a3203f}
.gwarn-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.gwarn-btns .gbtn{font-size:15px;padding:9px 16px}
.gmorehint{align-self:flex-start}
.gwarn-btns .gok{background:#FFC933;color:#3a2a00;box-shadow:0 3px 0 #d9a100}
.ghint[hidden]{display:none}
.gres{font-size:13.5px;font-weight:600;border-radius:12px;padding:6px 10px}
.gres[hidden]{display:none}
.ginfo{font-size:12.5px;line-height:1.5;background:#eef5ff;border:2px solid #cfe0ff;border-radius:12px;padding:7px 10px}
.ginfo[hidden]{display:none}
.ginfo small{color:var(--muted)}
.gres.ok{background:#eafaf0;color:#1a6f3e} .gres.ko{background:#fff0f4;color:#a3203f} .gres.work{background:#fff9e6;color:#7a5a00}
.gpts{font-size:14px;font-weight:600;color:#1a6f3e;background:#fff;border-radius:999px;padding:3px 12px;align-self:flex-start;box-shadow:0 2px 0 #cfeedd}
.gpts.zero{color:#a05a00;box-shadow:0 2px 0 #ffd9a8}
.gtotal{font-size:12.5px;font-weight:600;color:#0b6e75;background:#fff;border-radius:999px;padding:2px 10px}
.gbareme{font-size:12.5px;color:var(--muted);margin:0}
.gbareme b{color:#1a6f3e}
.gdots button.zero{background:#ffb84d;border-color:#ffb84d;color:#fff}
body.guided .exwrap,body.guided #ddFile,body.guided #ddBoard{display:none}
body.guided aside .tabs{margin-top:8px}
#btnGuide.on{background:#34B34A;box-shadow:0 3px 0 #23803a}
.guide.gbar:not(.gfin){padding-left:28px}   /* la consigne ne colle plus au bouton « Serveur prêt » */
.gpush.check .cap{width:62px;height:62px;font-size:30px;border-width:4px}
.gbar .gpushes .gpush.check .lab{font-size:14px;max-width:100px}
`;

  let o = null, course = null, state = null, panel = null, busy = false;   // busy : vérification en cours
  const LIBRE = 'blocs-guide-programme-libre';
  /* Barème : chaque indice demandé ET chaque vérification ratée compte comme une « pénalité ».
     0 pénalité : 3 points · 1 : 2 · 2 : 1,5 · 3 : 1 · 4 ou plus : 0 ; 0 aussi si l'élève a pris la solution. */
  const POINTS = [3, 2, 1.5, 1];
  const penalties = (s) => ((s && s.hints) || 0) + ((s && s.fails) || 0);
  /* Points perdus à cause des indices, des erreurs et de la solution (dans l'ordre où ils sont arrivés) */
  function lostDetail(s) {
    s = s || {};
    const h = s.hints || 0, f = s.fails || 0;
    let seq = typeof s.seq === 'string' ? s.seq : '';
    const ni = (seq.match(/i/g) || []).length, ne = (seq.match(/e/g) || []).length;
    if (ni < h || ne < f) seq += 'i'.repeat(Math.max(0, h - ni)) + 'e'.repeat(Math.max(0, f - ne));   // anciennes données : ordre inconnu
    const out = { hints: 0, fails: 0, solution: 0 };
    let p = 3;
    for (let k = 0; k < seq.length && p > 0; k++) {
      const next = POINTS[k + 1] != null ? POINTS[k + 1] : 0;
      out[seq[k] === 'i' ? 'hints' : 'fails'] += p - next; p = next;
    }
    if (s.solution) { out.solution = p; p = 0; }
    else if (!s.done) { out.solution = 0; }
    return out;
  }
  const pointsNow = (s) => (s && s.solution ? 0 : (POINTS[penalties(s)] != null ? POINTS[penalties(s)] : 0));
  const BAREME = 'Barème : 3 points du premier coup · chaque indice ou chaque erreur enlève un cran : 2, puis 1,5, puis 1, puis 0 · 0 avec la solution.';
  const fmt = (n) => String(n).replace('.', ',');
  const pts = (n) => fmt(n) + (n > 1 ? ' points' : ' point');
  const totalPoints = () => course.missions.reduce((t, m) => { const s = state.missions[m.id]; return t + (s && s.done ? s.points || 0 : 0); }, 0);
  const safe = (fn) => { try { return fn(); } catch (e) { return null; } };
  const keyOf = (c) => 'blocs-guide-' + c.id + ((o && o.storageSuffix) || '');   // progression enregistrée pour chaque parcours
  /* Bilan chiffré d'un parcours (utilisé par la fenêtre de bilan, le PDF et la plateforme SCORM) */
  function summary(c, st) {
    c = c || course; st = st || state;
    const max = c.missions.length * 3;
    const missions = c.missions.map((m, i) => { const s = st.missions[m.id] || {}; return { n: i + 1, title: m.title, done: !!s.done, points: s.done ? s.points || 0 : 0, hints: s.hints || 0, fails: s.fails || 0, solution: !!s.solution, lost: s.done ? lostDetail(s) : { hints: 0, fails: 0, solution: 0 } }; });   // les points perdus ne comptent que pour les missions terminées
    const total = missions.reduce((t, m) => t + m.points, 0);
    const lost = missions.reduce((t, m) => ({ hints: t.hints + m.lost.hints, fails: t.fails + m.lost.fails, solution: t.solution + m.lost.solution }), { hints: 0, fails: 0, solution: 0 });
    return { lost: lost, course: c.title, id: c.id, total: total, max: max, pct: max ? Math.round(1000 * total / max) / 10 : 0, note20: max ? Math.round(40 * total / max) / 2 : 0,
      done: missions.filter((m) => m.done).length, missions: missions, finished: !!st.finished };
  }
  const store = () => {
    if (!course || !state) return;
    safe(() => localStorage.setItem(keyOf(course), JSON.stringify(state)));
    if (o.progress && o.progress.save) safe(() => o.progress.save(course, state, summary()));
  };
  const loadState = (c) => {
    const st = safe(() => JSON.parse(localStorage.getItem(keyOf(c)))) || { cur: 0, missions: {} };
    if (!st.missions) st.missions = {};
    /* plateforme (SCORM) : la progression enregistrée là-bas fait foi ; les programmes restent dans le navigateur */
    const ext = o.progress && o.progress.load ? safe(() => o.progress.load(c)) : null;
    if (ext) {
      for (const id of Object.keys(st.missions)) { const p = st.missions[id].program; st.missions[id] = p ? { program: p } : {}; }
      for (const [id, v] of Object.entries(ext.missions || {})) st.missions[id] = Object.assign(st.missions[id] || {}, v);
      if (ext.cur != null) st.cur = ext.cur;
      st.finished = !!ext.finished;
    }
    if (!(st.cur >= 0 && st.cur < c.missions.length)) st.cur = 0;
    return st;
  };
  let courses = [];
  const el = (tag, attrs, kids) => root.SimCore.el(tag, attrs, kids);

  /* Boîte à outils réduite : uniquement les blocs autorisés par la mission (les catégories vides disparaissent). */
  function reducedToolbox(allowed) {
    const keep = new Set(allowed);
    const out = [];
    const walk = (cats) => {
      for (const c of cats) {
        if (c.kind !== 'category') continue;
        if (c.custom === 'VARIABLE') { if (keep.has('VARIABLE')) out.push(c); continue; }
        const blocks = (c.contents || []).filter((x) => x.kind === 'block' && keep.has(x.type));
        const seen = new Set();
        const uniq = blocks.filter((x) => { const k = x.type + JSON.stringify(x.fields || {}); if (seen.has(k)) return false; seen.add(k); return true; });
        if (uniq.length) out.push(Object.assign({}, c, { contents: uniq, expanded: undefined }));
        walk((c.contents || []).filter((x) => x.kind === 'category'));
      }
    };
    walk(o.fullToolbox.contents);
    // un même bloc peut être rangé dans deux catégories (ex. « envoyer » dans Radio et Télécommande) : on n'en garde qu'un
    const used = new Set();
    for (const c of out) if (c.contents) c.contents = c.contents.filter((x) => { if (used.has(x.type)) return false; used.add(x.type); return true; });
    return { kind: 'categoryToolbox', contents: out.filter((c) => c.custom || c.contents.length) };
  }

  /* ----- Outils de vérification donnés aux missions ----- */
  function tester() {
    const ws = o.ws, sim = o.sim;
    const all = () => ws.getAllBlocks(false).filter((b) => b.isEnabled());
    const rootOf = (b) => { let r = b; while (r.getParent()) r = r.getParent(); return r; };
    const T = {
      blocks: (type, pred) => all().filter((b) => b.type === type && (!pred || pred(b))),
      has: (type, pred) => T.blocks(type, pred).length > 0,
      inHat: (b, hat) => rootOf(b).type === hat,
      allIn: (type, hat) => T.blocks(type).length > 0 && T.blocks(type).every((b) => T.inHat(b, hat)),
      orphans: () => ws.getTopBlocks(false).filter((b) => b.isEnabled() && b.type !== 'arduino_setup' && b.type !== 'arduino_loop').length,
      field: (b, name) => b.getFieldValue(name),
      numIn: (b, input) => { const t = b.getInputTargetBlock(input); return t && t.type === 'math_number' ? Number(t.getFieldValue('NUM')) : null; },
      robot: () => (sim.hw.robot && sim.hw.robot.canvas ? sim.hw.robot : null),
      pose: () => { const r = T.robot(); return r ? { x: r.pose.x, y: r.pose.y, th: r.pose.th, l: r.m.l, r: r.m.r, led: r.ledOn, d: r.distance() } : null; },
      offTrack: () => { const r = T.robot(); return r ? root.RobotSim.distToTrack(r.pose.x, r.pose.y) : 0; },
      /* Lance le programme dans le simulateur après avoir placé le robot et l'obstacle. */
      async start(opt) {
        opt = opt || {};
        const placeBox = () => {
          const r = sim.hw.robot;
          if (!r) return;
          r.box.on = !!opt.obstacle;
          if (opt.obstacle) { r.box.x = opt.obstacle.x; r.box.y = opt.obstacle.y; }
        };
        placeBox();
        sim.setSpeed(opt.speed || 1);   // vitesse normale : l'élève a le temps de voir chaque étape du test
        sim.start();
        placeBox();
        const r = sim.hw.robot;
        if (r && opt.robot) { r.pose = { x: opt.robot.x, y: opt.robot.y, th: opt.robot.th || 0 }; }
        if (r && r.canvas && r.canvas.isConnected) { const b = r.canvas.closest('.robotbox').querySelector('.simbar .simbtn.light:nth-child(4)'); if (b) b.textContent = 'Obstacle : ' + (r.box.on ? 'oui' : 'non'); r.paint(); }
        await T.wait(60);
      },
      moveObstacle(x, y, on) { const r = T.robot(); if (!r) return; r.box.on = on !== false; if (x != null) { r.box.x = x; r.box.y = y; } r.paint(); },
      /* Attend une durée « simulée » (en millisecondes de la carte virtuelle). */
      now: () => sim.runner.millis(),
      /* Attend une durée en temps de la carte virtuelle. */
      async wait(ms) {
        const end = T.now() + ms;
        while (T.now() < end) await new Promise((res) => setTimeout(res, Math.max(1, Math.min(15, (end - T.now()) / (sim.speed || 1)))));
      },
      /* Attend qu'une condition soit vraie ; renvoie le temps écoulé (ms simulées), ou -1. */
      async until(cond, maxMs, every) {
        const t0 = T.now();
        while (T.now() - t0 <= maxMs) { if (cond()) return T.now() - t0; await T.wait(every || 50); }
        return -1;
      },
      async pressMode(ms) { const r = T.robot(); if (!r) return; r.pressed = true; r.clicks++; await T.wait(ms || 250); r.pressed = false; },
      radio(v) { sim.hw.m.radio.inbox.push(v); },
      running: () => sim.running,
      /* Légende affichée pendant le test (« Test 1 / 4 : … ») : sur la piste du robot, sinon en haut du simulateur. */
      caption(t) {
        const r = sim.hw.robot;
        if (r && r.caption && r.canvas && r.canvas.isConnected) { r.caption(t); return; }
        let c = document.getElementById('gcaption');
        if (!c) { c = el('div', { id: 'gcaption', class: 'gcaption' }); const bar = document.querySelector('#simPanel .simbar'); if (bar) bar.after(c); }
        c.hidden = !t; c.textContent = t || '';
      },
      /* --- cartes et montages (LED, boutons, télécommande, pistolet, cibles) --- */
      angle: (p) => { const a = sim.hw.angles && sim.hw.angles[String(p)]; return a == null ? null : a; },
      pin: (p) => { const s = sim.hw.pins[String(p)]; return s ? (s.pwm != null ? (s.pwm > 0 ? 1 : 0) : s.v) : 0; },
      /* appuie sur un bouton de la carte… et une main le montre à l'écran */
      setButton(p, down) {
        const k = sim.hw.setPressed ? sim.hw.setPressed(p, down) : (sim.hw.pressed[String(p)] = !!down, null);
        if (k && root.SimCore.finger) root.SimCore.finger(k, down ? 'press' : 'hover');
      },
      m: () => sim.hw.m,
      hold(key, down) {
        const m = sim.hw.m; m.btn[key] = !!down; if (down) m.clicks[key] = (m.clicks[key] || 0) + 1;
        const b = document.querySelector('#simPanel .mbtn[data-key="' + key + '"]');
        if (b) { b.classList.toggle('down', !!down); if (root.SimCore.finger) root.SimCore.finger(b, down ? 'press' : 'hover'); }
      },
      async press(key, ms) { T.hold(key, true); await T.wait(ms || 250); T.hold(key, false); },
      shoot(i) { sim.hw.m.hitUntil[i] = performance.now() + 400 / (sim.speed || 1); },
      out: (k) => sim.hw.m.outs[k] || 0,
      bar: (k) => sim.hw.m.bars[k],
      flaps: () => sim.hw.m.flaps.slice(),
      cibleLeds: () => sim.hw.m.leds.slice(),
      sent: () => sim.hw.m.radio.sent,
      sentCount: () => sim.hw.m.radio.sentCount,
      /* Relève une valeur à intervalles réguliers pendant une durée (temps de la carte virtuelle). */
      async sample(fn, ms, every) { const out = []; const t0 = T.now(); while (T.now() - t0 < ms) { out.push([T.now() - t0, fn()]); await T.wait(every || 25); } return out; },
    };
    root.__guideT = T;   // pour les tests automatiques
    return T;
  }

  /* ----- Affichage du panneau ----- */
  function mission() { return course.missions[state.cur]; }
  function render(start) {   // start : début de mission → les détails s'ouvrent
    const m = mission(), st = state.missions[m.id] || {};
    panel.innerHTML = '';
    const dots = el('div', { class: 'gdots' });
    course.missions.forEach((mm, i) => {
      const open = reachable(i);
      const d = el('button', { type: 'button', text: open ? String(i + 1) : '🔒', title: (i + 1) + '. ' + mm.title, onclick: () => goTo(i) });
      if (!open) { d.classList.add('lock'); d.disabled = true; d.title = 'Mission ' + (i + 1) + ' verrouillée : réussis d\'abord la mission ' + (firstUndone() + 1); }
      const ms = state.missions[mm.id] || {};
      if (ms.done) d.classList.add(ms.points > 0 ? 'done' : 'zero');
      if (i === state.cur) d.classList.add('cur');
      dots.appendChild(d);
    });
    panel.classList.add('gbar'); panel.classList.remove('gpick', 'gfin');
    const gmain = el('div', { class: 'gmain' });
    const pop = el('div', { class: 'gpop', hidden: '' });
    const hint = el('div', { class: 'ghint', hidden: '' });   // les détails : explication, critères, barème, indices…
    panel.appendChild(gmain);
    // la ligne « parcours · mission » et les pastilles vont au-dessus des onglets Code / Simulateur
    const prog = progressSlot();
    prog.innerHTML = ''; prog.hidden = false;
    prog.appendChild(el('div', { class: 'ghead' }, [el('span', { class: 'gnum', text: course.title + ' · ' + (state.cur + 1) + ' / ' + course.missions.length }), dots]));
    const line = el('div', { class: 'gline' });
    gmain.appendChild(line);
    line.appendChild(el('h3', { class: 'gtitle', text: m.title }));
    /* la consigne est dite par la mascotte, dans une bulle */
    const sayBox = el('div', { class: 'gsay' });
    const src = document.getElementById('mascot');
    if (src) { const mc = src.cloneNode(true); mc.removeAttribute('id'); mc.setAttribute('class', 'mascot gmascot'); mc.setAttribute('data-mood', st.done ? 'happy' : 'idle'); sayBox.appendChild(mc); panel.mascot = mc; }
    sayBox.appendChild(el('div', { class: 'gbubble', html: m.goal }));
    line.appendChild(sayBox);
    pop.appendChild(el('div', { class: 'gpopnote' }, [
      el('span', { class: 'gmini', 'aria-hidden': 'true' }, [el('span', { class: 'cap', text: 'i' }), el('span', { class: 'lab', text: 'Détails de la mission' })]),
      el('span', { class: 'gpopnotetxt', html: 'Ces détails restent accessibles <b>à tout moment</b> : clique sur le bouton rond <b>Détails de la mission</b>, à droite de la consigne.' }),
      el('button', { type: 'button', class: 'gpopclose', text: '✕', title: 'Fermer (Échap)', onclick: () => openPop(false) })]));
    pop.appendChild(hint);   // les indices, en premier et en gros
    if (m.explain) { const d = el('div', { class: 'gexp' }); d.appendChild(el('b', { text: 'Comment ça marche ?' })); d.appendChild(el('p', { html: m.explain })); pop.appendChild(d); }
    const crit = el('ul', { class: 'gcrit' });
    m.criteria.forEach((c) => crit.appendChild(el('li', { text: c })));
    if (st.done) [...crit.children].forEach((li) => li.classList.add('ok'));
    pop.appendChild(el('b', { class: 'gpoph', text: 'Ce que je vais vérifier' }));
    pop.appendChild(crit);
    const bareme = el('p', { class: 'gbareme' });
    const showBareme = () => {
      const cur = state.missions[m.id] || {};
      const h = cur.hints || 0, f = cur.fails || 0;
      const detail = h || f ? ' (' + [h ? h + ' indice' + (h > 1 ? 's' : '') : '', f ? f + ' erreur' + (f > 1 ? 's' : '') : ''].filter(Boolean).join(', ') + ')' : '';
      bareme.innerHTML = (cur.done ? 'Mission réussie. ' : 'Si tu réussis maintenant : <b>' + pts(pointsNow(cur)) + '</b>' + detail + '. ') + BAREME;
    };
    showBareme();
    panel.showBareme = showBareme;
    pop.appendChild(bareme);
    const res = el('div', { class: 'gres', hidden: '' });
    const used = st.hints || 0;
    /* gros boutons ronds, façon bouton poussoir */
    const push = (cls, icon, label, title) => el('button', { type: 'button', class: 'gbtn gpush ' + cls, title: title || label }, [el('span', { class: 'cap', text: icon }), el('span', { class: 'lab', text: label })]);
    const btnHint = push('hint', '💡', 'Indice' + (m.hints.length ? ' ' + Math.min(used, m.hints.length) + '/' + m.hints.length : ''), 'Demander un indice (chaque indice enlève des points)');
    const showHints = (n) => {
      if (n <= 0) return;
      hint.hidden = false;
      hint.innerHTML = m.hints.slice(0, n).map((h, i) => '<div class="ghitem"><span class="ghlab">💡 Indice ' + (i + 1) + '</span><span>' + h + '</span></div>').join('');
      if (n < m.hints.length) hint.appendChild(el('button', { type: 'button', class: 'gbtn hint gmorehint', text: '💡 Demander l\'indice ' + (n + 1) + ' (' + (m.hints.length - n) + ' restant' + (m.hints.length - n > 1 ? 's' : '') + ')', onclick: () => btnHint.onclick() }));
    };
    showHints(Math.min(used, m.hints.length));
    btnHint.onclick = () => {
      const cur = state.missions[m.id] || {};
      if ((cur.hints || 0) >= m.hints.length) { openPop(true); return; }   // tous les indices sont déjà donnés : on les relit
      // avertissement : un indice fait perdre des points
      const now = pointsNow(cur), after = pointsNow(Object.assign({}, cur, { hints: (cur.hints || 0) + 1 }));
      warn(cur.done
        ? 'Tu as déjà réussi cette mission : ton score ne changera pas. Veux-tu voir l\'indice ' + ((cur.hints || 0) + 1) + ' ?'
        : 'Attention : un indice te fait perdre des points ! Si tu réussis maintenant, cette mission te rapporte <b>' + pts(now) + '</b>. Avec cet indice, elle ne te rapportera plus que <b>' + pts(after) + '</b>.',
      giveHint);
    };
    const giveHint = () => {
      const s = state.missions[m.id] = state.missions[m.id] || {};
      s.hints = Math.min((s.hints || 0) + 1, m.hints.length);
      if (!s.done) s.seq = (s.seq || '') + 'i';   // ordre des indices et des erreurs, pour le bilan
      store(); showHints(s.hints); openPop(true);
      btnHint.querySelector('.lab').textContent = 'Indice ' + s.hints + '/' + m.hints.length;
      showBareme();
      say('idle', s.hints >= m.hints.length ? 'Tu as tous les indices ! Tu peux y arriver.' : 'Voici un indice. Lis-le bien !');
      if (s.hints >= m.hints.length) btnSol.hidden = false;
    };
    const btnCheck = push('check', '✔', 'Valide ta mission', 'Tester mon programme dans le simulateur pour valider la mission');
    btnCheck.onclick = () => verify(btnCheck, res, crit);
    const btnNext = el('button', { type: 'button', class: 'gbtn next', text: state.cur + 1 < course.missions.length ? 'Mission suivante →' : 'Terminer le parcours' });
    btnNext.hidden = !st.done;
    btnNext.onclick = () => (state.cur + 1 < course.missions.length ? goTo(state.cur + 1) : finish());
    const btnSol = el('button', { type: 'button', class: 'gbtn light', text: 'Voir la solution (0 point)' });
    btnSol.hidden = !((st.fails || 0) >= 3 || used >= m.hints.length);
    btnSol.onclick = () => {
      if (!confirm('Remplacer ton programme par la solution ? Cette mission rapportera 0 point, mais tu pourras l\'étudier et passer à la suite.')) return;
      const s = state.missions[m.id] = state.missions[m.id] || {};
      s.solution = true; store(); showBareme();
      o.loadState(m.solution());
      o.ws.cleanUp();
      say('idle', 'Voici une solution. Lis-la bloc par bloc, puis clique sur « Valide ta mission ».');
    };
    const btnMore = push('gmore', 'i', 'Détails de la mission', 'Comment ça marche, ce qui est vérifié, barème, indices');
    btnMore.setAttribute('aria-expanded', 'false');
    /* fenêtre « Détails » : en grand au milieu de l'écran ; elle sort du bouton i et y retourne en rapetissant */
    const back = el('div', { class: 'gpopback', hidden: '' });
    const flyFrom = () => {
      const b = btnMore.querySelector('.cap').getBoundingClientRect(), p = pop.getBoundingClientRect();
      return 'translate(-50%,-50%) translate(' + Math.round(b.left + b.width / 2 - (p.left + p.width / 2)) + 'px,' + Math.round(b.top + b.height / 2 - (p.top + p.height / 2)) + 'px) scale(.06)';
    };
    const openPop = (on) => {
      btnMore.setAttribute('aria-expanded', String(!!on)); btnMore.classList.toggle('on', !!on);
      const anim = pop.animate && !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
      if (on) {
        if (!pop.hidden) return;
        pop.hidden = false; back.hidden = false;
        if (anim) {
          pop.animate([{ transform: flyFrom(), opacity: 0.3 }, { transform: 'translate(-50%,-50%)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.15)' });
          back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
        }
      } else {
        if (pop.hidden) return;
        const end = () => { pop.hidden = true; back.hidden = true; if (panel.__blinkOnClose) { panel.__blinkOnClose = false; blinkTitle(); } };   // le titre clignote quand l'élève a fermé les détails
        if (!anim) { end(); return; }
        const a = pop.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: flyFrom(), opacity: 0.2 }], { duration: 480, easing: 'cubic-bezier(.6,0,.8,.4)' });
        back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480 });
        a.onfinish = end;
        btnMore.querySelector('.cap').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 300, delay: 420 });
      }
    };
    panel.__closePop = () => openPop(false);
    btnMore.onclick = (e) => { e.stopPropagation(); openPop(pop.hidden); };
    back.onclick = () => openPop(false);
    if (!panel.__popKey) { panel.__popKey = true; document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.__closePop) panel.__closePop(); }); }
    panel.appendChild(back);
    // à droite du bandeau : le score, puis les boutons
    panel.appendChild(el('div', { class: 'gside' }, [
      el('div', { class: 'gbtns gsmall' }, [btnNext, btnSol]),
      el('div', { class: 'gbtns gpushes' }, [btnCheck, btnHint])]));
    line.appendChild(btnMore);   // à droite de la bulle de la consigne
    showScore();
    pop.appendChild(res);
    const info = el('div', { class: 'ginfo', hidden: '' });
    pop.appendChild(info);
    if (st.done) pop.appendChild(el('div', { class: 'gpts' + (st.points > 0 ? '' : ' zero'), text: 'Points gagnés : ' + fmt(st.points || 0) + ' / 3' }));
    panel.appendChild(pop);
    // à chaque début de mission, les détails s'affichent (sauf pendant les tests automatiques)
    const autoOpen = start && safe(() => localStorage.getItem('atelier-sans-intro')) !== '1';
    panel.__blinkOnClose = !!autoOpen;
    if (autoOpen) setTimeout(() => openPop(true), 60);
    fitBubble(line.querySelector('.gbubble'));
    panel.btnNext = btnNext;
    missionTitle(m.title, 'Mission ' + (state.cur + 1), !!start && !autoOpen);   // en grand, en bas de la zone des blocs
    relayout();
  }

  async function verify(btn, res, crit) {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    const m = mission();
    res.hidden = false; res.className = 'gres work'; res.textContent = course.robot ? 'Je teste ton programme sur le robot virtuel…' : 'Je teste ton programme sur la carte virtuelle…';
    { const info = panel.querySelector('.ginfo'); if (info) info.hidden = true; }
    say('work', 'Je teste ton programme… Regarde le simulateur !');
    if (panel.mascot) panel.mascot.setAttribute('data-mood', 'work');
    o.showTab('sim');
    const stage = openStage(m);
    const prevSpeed = o.sim.speed || 1;
    let r;
    try { r = await m.check(tester()); } catch (e) { r = { ok: false, msg: 'Le test a rencontré un problème : ' + (e && e.message ? e.message : e) }; }
    o.sim.stop();
    o.sim.setSpeed(prevSpeed);
    if (o.sim.hw.robot && o.sim.hw.robot.caption) o.sim.hw.robot.caption('');
    { const c = document.getElementById('gcaption'); if (c) c.hidden = true; }
    if (root.SimCore.fingersOff) root.SimCore.fingersOff();
    const s = state.missions[m.id] = state.missions[m.id] || {};
    if (r.ok) {
      const won = pointsNow(s);
      s.points = s.done ? Math.max(s.points || 0, won) : won;
      s.done = true;
      res.className = 'gres ok'; res.textContent = plain(r.msg || 'Bravo, mission réussie !');
      [...crit.children].forEach((li) => { li.classList.remove('ko'); li.classList.add('ok'); });
      say(won > 0 ? 'happy' : 'idle', won > 0 ? 'Mission réussie : ' + pts(won) + ' !' + (state.cur + 1 < course.missions.length ? ' Passe à la suivante !' : '')
        : 'Mission terminée avec la solution : 0 point. Essaie de bien la comprendre !');
      if (root.ArduinoArt) root.ArduinoArt.confetti();
      store(); render();
      if (panel.btnNext) panel.btnNext.classList.add('blink');   // invite à passer à la suite
      if (panel.mascot) panel.mascot.setAttribute('data-mood', 'happy');
      stage.success(r.msg || 'Bravo, mission réussie !', won);
      const resNew = panel.querySelector('.gres'); resNew.hidden = false; resNew.className = 'gres ok'; resNew.textContent = r.msg || 'Bravo, mission réussie !';
    } else {
      if (!s.done) { s.fails = (s.fails || 0) + 1; s.seq = (s.seq || '') + 'e'; }   // une erreur enlève des points, comme un indice
      store();
      if (panel.showBareme) panel.showBareme();
      res.className = 'gres ko'; res.textContent = plain(r.msg);
      if (panel.mascot) panel.mascot.setAttribute('data-mood', 'oops');
      const info = panel.querySelector('.ginfo');
      if (info) { info.hidden = !r.info; info.innerHTML = r.info || ''; }
      stage.fail(r.msg, r.info);
      if (r.crit != null && crit.children[r.crit]) { [...crit.children].forEach((li, i) => li.classList.toggle('ok', i < r.crit)); crit.children[r.crit].classList.add('ko'); }
      say('oops', 'Pas encore… Lis le message, corrige, puis vérifie à nouveau.');
      if (s.fails >= 3) { const b = [...panel.querySelectorAll('.gbtn.light')].find((x) => /solution/.test(x.textContent)); if (b) b.hidden = false; }
    }
    btn.disabled = false;
    busy = false;
  }

  /* messages des vérifications : « &lt; » devient « < », et les éventuelles balises <b> sont retirées */
  const plain = (t) => { const d = document.createElement('div'); d.innerHTML = String(t == null ? '' : t); return d.textContent; };

  /* ----- Scène de vérification : le simulateur s'affiche en grand au milieu de l'écran pendant le test ----- */
  function openStage(m) {
    closeStage();
    const sp = document.getElementById('simPanel');
    const home = { parent: sp.parentNode, next: sp.nextSibling };
    const status = el('p', { class: 'gstage-status', text: course.robot ? 'Je teste ton programme sur le robot virtuel… Regarde bien !' : 'Je teste ton programme sur la carte virtuelle… Regarde bien !' });
    const slot = el('div', { class: 'gstage-sim' });
    const foot = el('div', { class: 'gstage-foot' });
    const card = el('div', { class: 'gstage-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Vérification de la mission' }, [
      el('div', { class: 'gstage-head' }, [el('b', { text: 'Mission ' + (state.cur + 1) + ' : ' + m.title }), status]), slot, foot]);
    const ov = el('div', { class: 'gstage' + (course.robot ? ' robot' : '') }, [card]);
    document.body.appendChild(ov);
    slot.appendChild(sp);
    slot.setAttribute('inert', '');   // ni clic ni clavier dans le simulateur pendant le test
    sp.hidden = false;
    const repaint = () => { const r = o.sim.hw && o.sim.hw.robot; if (r && r.canvas && r.canvas.isConnected) r.paint(); };
    requestAnimationFrame(repaint);
    let done = false;
    const close = () => {
      if (!ov.isConnected) return;
      document.removeEventListener('keydown', onKey);
      if (home.parent) home.parent.insertBefore(sp, home.next && home.next.parentNode === home.parent ? home.next : null);
      ov.remove();
      requestAnimationFrame(repaint);
      stageClose = null;
    };
    const onKey = (e) => { if (e.key === 'Escape' && done) close(); };
    document.addEventListener('keydown', onKey);
    stageClose = close;
    const big = (text, cls, fn) => el('button', { type: 'button', class: 'gbtn gstage-btn ' + (cls || ''), text: text, onclick: fn });
    return {
      success(msg, won) {
        done = true;
        status.className = 'gstage-status ok';
        status.textContent = '🎉 ' + plain(msg);
        ov.classList.add('won');
        // les confettis tombent, puis le gros bouton « Mission suivante » apparaît
        setTimeout(() => {
          if (!ov.isConnected) return;
          const last = state.cur + 1 >= course.missions.length;
          foot.appendChild(el('div', { class: 'gstage-pts', text: won > 0 ? '+ ' + pts(won) : 'Mission terminée avec la solution : 0 point' }));
          const next = big(last ? 'Terminer le parcours 🏁' : 'Mission suivante →', 'next blink', () => { close(); if (last) finish(); else goTo(state.cur + 1); });
          foot.appendChild(next);
          foot.appendChild(big('Rester sur cette mission', 'light', close));
          next.focus({ preventScroll: true });
          foot.scrollIntoView({ block: 'end', behavior: 'smooth' });
        }, 1700);
      },
      fail(msg, info) {
        done = true;
        status.className = 'gstage-status ko';
        status.textContent = plain(msg);
        if (info) foot.appendChild(el('div', { class: 'ginfo gstage-info', html: info }));
        const b = big('Corriger mon programme', '', close);
        foot.appendChild(b);
        b.focus({ preventScroll: true });
        card.scrollTop = 0;
      },
      close: close,
    };
  }
  let stageClose = null;
  function closeStage() { if (stageClose) stageClose(); }

  /* Bouton du bandeau pendant le mode guidé : petit menu « Changer de parcours » / « Quitter le mode guidé » */
  let gmenu = null;
  function toggleMenu() {
    if (gmenu) { gmenu.remove(); gmenu = null; return; }
    const r = o.button.getBoundingClientRect();
    const item = (text, fn) => el('button', { type: 'button', text: text, onclick: () => { gmenu.remove(); gmenu = null; fn(); } });
    gmenu = el('div', { class: 'gmenu', role: 'menu' }, [item('↩ Changer de parcours', () => picker()), item('✖ Quitter le mode guidé', () => exit())]);
    gmenu.style.top = (r.bottom + 8) + 'px';
    gmenu.style.left = r.left + 'px';
    document.body.appendChild(gmenu);
    const w = gmenu.getBoundingClientRect();
    if (w.right > innerWidth - 8) gmenu.style.left = Math.max(8, innerWidth - 8 - w.width) + 'px';
    gmenu.querySelector('button').focus();
    setTimeout(() => document.addEventListener('click', function off(e) { if (gmenu && !gmenu.contains(e.target)) { gmenu.remove(); gmenu = null; } document.removeEventListener('click', off); }), 0);
  }

  /* ----- Navigation entre missions ----- */
  function loadMissionProgram() {
    const m = mission(), st = state.missions[m.id] || {};
    o.ws.updateToolbox(reducedToolbox(m.blocks));
    o.loadState(st.program || m.start());
  }
  /* Les missions se débloquent dans l'ordre : le programme de départ d'une mission contient la solution de la précédente. */
  let home = {};
  /* la mascotte (en bas à droite) parle… et rappelle toujours le score du parcours */
  function showScore() {
    const b = document.getElementById('bubble');
    if (!b || !GuideMode.active) return;
    let sc = b.parentNode.querySelector('.gscorebubble');
    if (!sc) { sc = el('div', { class: 'bubble gscorebubble', 'data-mood': 'happy' }); b.after(sc); }
    sc.textContent = course && state ? '🏅 Score : ' + fmt(totalPoints()) + ' / ' + course.missions.length * 3 + ' points' : '🏅 Choisis un parcours !';
  }
  function say(mood, text) { o.say(mood, text); showScore(); }
  /* bulle de la consigne : la plus étroite possible, en visant 3 lignes */
  function fitBubble(b) {
    if (!b) return;
    requestAnimationFrame(() => {
      b.style.width = '';
      const cs = getComputedStyle(b), lh = parseFloat(cs.lineHeight) || 18;
      const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const max = Math.min(560, b.parentNode.getBoundingClientRect().width - 40);
      for (let w = 200; w <= max; w += 12) {
        b.style.width = w + 'px';
        if (b.scrollHeight - pad <= lh * 3 + 2) return;
      }
      b.style.width = max + 'px';
    });
  }
  /* titre de la mission, en grand, au milieu en bas de l'espace des blocs (les blocs passent par-dessus) */
  function wsArea() { try { return o.ws.getInjectionDiv().parentNode; } catch (e) { return null; } }
  /* petite fenêtre d'avertissement (Oui / Non) */
  function warn(html, onYes) {
    const box = el('div', { class: 'gwarn', role: 'alertdialog', 'aria-modal': 'true' }, [
      el('div', { class: 'gwarn-card' }, [
        el('div', { class: 'gwarn-ico', text: '⚠️' }),
        el('p', { html: html }),
        el('div', { class: 'gwarn-btns' }, [
          el('button', { type: 'button', class: 'gbtn gok', text: 'Oui, je veux un indice' }),
          el('button', { type: 'button', class: 'gbtn light gno', text: 'Non, je cherche encore' })])])]);
    const close = (yes) => { document.removeEventListener('keydown', key, true); box.remove(); if (yes) onYes(); };
    const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); } };
    box.querySelector('.gok').onclick = () => close(true);
    box.querySelector('.gno').onclick = () => close(false);
    box.addEventListener('click', (e) => { if (e.target === box) close(false); });
    document.addEventListener('keydown', key, true);
    document.body.appendChild(box);
    box.querySelector('.gno').focus();
  }
  function blinkTitle() {
    const area = wsArea(), d = area && area.querySelector(':scope > .gmtitle');
    if (!d || d.hidden) return;
    d.classList.remove('blink5'); void d.offsetWidth; d.classList.add('blink5');
    clearTimeout(d.__t); d.__t = setTimeout(() => d.classList.remove('blink5'), 5200);   // clignote 5 s
  }
  function missionTitle(t, sub, blink) {
    const area = wsArea(); if (!area) return;
    let d = area.querySelector(':scope > .gmtitle');
    if (!d) { d = el('div', { class: 'gunder gmtitle', 'aria-hidden': 'true' }); area.prepend(d); }
    d.hidden = !t;
    if (!t) return;
    d.innerHTML = ''; d.appendChild(el('small', { text: sub || '' })); d.appendChild(document.createTextNode(t));
    if (blink) blinkTitle(); else d.classList.remove('blink5');
    placeUnder();
  }
  /* la mascotte passe dans l'espace des blocs pendant le mode guidé, et revient à sa place ensuite */
  let buddyHome = null;
  function buddyIn(on) {
    const b = document.querySelector('.buddy'), area = wsArea();
    if (!b || !area) return;
    if (on && b.parentNode !== area) { buddyHome = { parent: b.parentNode, next: b.nextSibling }; area.prepend(b); }
    if (!on && buddyHome && b.parentNode === area) { buddyHome.parent.insertBefore(b, buddyHome.next); buddyHome = null; }
  }
  function placeUnder() {
    const area = wsArea(); if (!area) return;
    const tb = area.querySelector('.blocklyToolboxDiv'), b = area.querySelector(':scope > .buddy');
    const d = area.querySelector(':scope > .gmtitle');
    if (!d) return;
    const left = tb ? tb.getBoundingClientRect().width : 0;
    const right = b ? b.getBoundingClientRect().width + 110 : 60;
    d.style.left = (left + 20) + 'px'; d.style.right = right + 'px';
  }
  /* bandeau de progression (parcours · mission + pastilles), placé au-dessus des onglets Code / Simulateur */
  function progressSlot() {
    let p = document.getElementById('guideProgress');
    if (!p) {
      p = el('div', { id: 'guideProgress', class: 'gprog', hidden: '' });
      const tabs = home.parent && home.parent.querySelector('.tabs');
      if (tabs) tabs.before(p); else if (home.parent) home.parent.prepend(p);
    }
    return p;
  }
  /* le bandeau a changé de hauteur : l'espace des blocs doit se redimensionner */
  function relayout() { requestAnimationFrame(() => { try { root.Blockly.svgResize(o.ws); } catch (e) {} placeUnder(); const r = o.sim && o.sim.hw && o.sim.hw.robot; if (r && r.paint) r.paint(); }); }
  function firstUndone() { const k = course.missions.findIndex((m) => !(state.missions[m.id] || {}).done); return k < 0 ? course.missions.length : k; }
  const reachable = (i) => i <= firstUndone();
  function goTo(i, force) {
    if (busy) return;
    if (!force && !reachable(i)) { say('idle', 'La mission ' + (i + 1) + ' est verrouillée : réussis d\'abord la mission ' + (firstUndone() + 1) + ' !'); return; }
    o.sim.stop();
    state.cur = i; store();
    loadMissionProgram();
    render(true);
    say('idle', 'Mission ' + (i + 1) + ' : ' + mission().title + '. Lis la consigne, puis construis ton programme !');
  }
  function finish() {
    state.finished = true;
    store();
    if (o.progress && o.progress.finish) safe(() => o.progress.finish(course, state, summary()));
    const sm = summary();
    panel.innerHTML = '';
    panel.classList.add('gbar', 'gfin'); panel.classList.remove('gpick');
    progressSlot().hidden = true;
    missionTitle('Parcours terminé !', course.title, true);
    panel.appendChild(el('h3', { class: 'gtitle', text: '🏆 Parcours terminé !' }));
    panel.appendChild(el('p', { class: 'ggoal', text: 'Tu as gagné ' + fmt(sm.total) + ' points sur ' + sm.max + ' (note : ' + fmt(sm.note20) + ' / 20). ' + (course.finish || '') }));
    panel.appendChild(el('p', { class: 'gexp', text: course.robot ? 'Téléverse ton dernier programme dans le vrai robot.' : 'Téléverse ton dernier programme dans la vraie carte.' }));
    panel.appendChild(el('div', { class: 'gbtns' }, [
      el('button', { type: 'button', class: 'gbtn', text: '📄 Mon bilan', onclick: () => report() }),
      el('button', { type: 'button', class: 'gbtn light', text: 'Revoir les missions', onclick: () => render() })]));
    say('happy', 'Bravo, tu as terminé le parcours « ' + course.title + ' » !');
    report();
    if (root.ArduinoArt) root.ArduinoArt.confetti();
  }

  /* ----- Bilan de fin de parcours : grande fenêtre, et PDF à télécharger avec le nom de l'élève ----- */
  const KEY_NOM = 'blocs-nom-eleve';
  const lostCell = (n, l) => n + (l > 0 ? '  (-' + fmt(l) + ')' : '');
  const lostSentence = (l) => {
    const parts = [];
    if (l.hints > 0) parts.push(pts(l.hints) + ' à cause des indices');
    if (l.fails > 0) parts.push(pts(l.fails) + ' à cause des erreurs');
    if (l.solution > 0) parts.push(pts(l.solution) + ' en affichant la solution');
    return parts.length ? 'Points perdus : ' + parts.join(' · ') + '.' : 'Aucun point perdu à cause des indices ou des erreurs' + (l.any ? ' : bravo !' : '.');
  };
  function report() {
    closeStage();
    const sm = summary();
    const rows = sm.missions.map((m) => el('tr', { class: m.done ? (m.solution ? 'sol' : 'ok') : 'ko' }, [
      el('td', { text: String(m.n) }), el('td', { text: m.title }),
      el('td', { text: m.done ? (m.solution ? '✔ avec la solution' : '✔ réussie') : '✘ pas réussie' }),
      el('td', { text: lostCell(m.hints, m.lost.hints) }), el('td', { text: lostCell(m.fails, m.lost.fails) }), el('td', { text: fmt(m.points) + ' / 3' })]));
    const table = el('table', { class: 'gbilan' }, [
      el('thead', {}, [el('tr', {}, ['N°', 'Mission', 'Résultat', 'Indices (points perdus)', 'Erreurs (points perdus)', 'Points'].map((t) => el('th', { text: t })))]),
      el('tbody', {}, rows)]);
    const lostTxt = el('p', { class: 'gnote-sub glost', text: lostSentence(Object.assign({ any: sm.done > 0 }, sm.lost)) });
    const name = el('input', { type: 'text', class: 'gname', placeholder: 'Ton prénom et ton nom', maxlength: '60', 'aria-label': 'Ton prénom et ton nom' });
    name.value = (o.studentName && o.studentName()) || safe(() => localStorage.getItem(KEY_NOM)) || '';
    const dl = el('button', { type: 'button', class: 'gbtn gstage-btn', text: '📄 Télécharger le bilan (PDF)' });
    const upd = () => { dl.disabled = name.value.trim().length < 2; };
    name.addEventListener('input', upd); upd();
    const msg = el('p', { class: 'gexp' });
    dl.onclick = async () => {
      const nm = name.value.trim();
      safe(() => localStorage.setItem(KEY_NOM, nm));
      dl.disabled = true; msg.textContent = 'Préparation du PDF…';
      try { await pdf(sm, nm); msg.textContent = 'Le bilan est enregistré dans tes téléchargements.'; }
      catch (e) { msg.textContent = 'Impossible de créer le PDF : ' + (e && e.message ? e.message : e); }
      upd();
    };
    const card = el('div', { class: 'gstage-card gbilan-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bilan du parcours' }, [
      el('div', { class: 'gstage-head' }, [el('b', { text: '🏆 Bilan du parcours « ' + course.title + ' »' })]),
      el('div', { class: 'gnote' }, [el('span', { text: fmt(sm.note20) }), el('small', { text: '/ 20' })]),
      el('p', { class: 'gnote-sub', text: sm.done + ' mission' + (sm.done > 1 ? 's' : '') + ' réussie' + (sm.done > 1 ? 's' : '') + ' sur ' + sm.missions.length + ' · ' + fmt(sm.total) + ' points sur ' + sm.max }),
      table, lostTxt,
      el('p', { class: 'gbareme', text: BAREME }),
      el('div', { class: 'gstage-foot' }, [name, dl, el('button', { type: 'button', class: 'gbtn gstage-btn light', text: 'Fermer', onclick: () => close() })]),
      msg]);
    const ov = el('div', { class: 'gstage' }, [card]);
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); stageClose = null; };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    stageClose = close;
    document.body.appendChild(ov);
    (name.value ? dl : name).focus();
  }
  /* jsPDF n'est chargé que lorsqu'on en a besoin */
  function loadPdfLib() {
    if (root.jspdf) return Promise.resolve(root.jspdf);
    return new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'vendor/jspdf/jspdf.umd.min.js';
      sc.onload = () => (root.jspdf ? res(root.jspdf) : rej(new Error('jsPDF introuvable')));
      sc.onerror = () => rej(new Error('fichier vendor/jspdf/jspdf.umd.min.js introuvable'));
      document.head.appendChild(sc);
    });
  }
  /* Illustrations du bilan : SVG dessinés ici, transformés en images PNG pour le PDF */
  function svgToPng(svg, w, h) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => { try { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); res(c.toDataURL('image/png')); } catch (e) { res(null); } };
      img.onerror = () => res(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  const STAR = (fill) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96"><defs><clipPath id="h"><rect width="12" height="24"/></clipPath></defs>'
    + '<path d="M12 1.8l3 6.4 7 .9-5.1 4.8 1.3 6.9L12 17.4l-6.2 3.4 1.3-6.9L2 9.1l7-.9z" fill="#e8ebf2" stroke="#c4cad8" stroke-width="1.2" stroke-linejoin="round"/>'
    + (fill ? '<path ' + (fill === 'half' ? 'clip-path="url(#h)" ' : '') + 'd="M12 1.8l3 6.4 7 .9-5.1 4.8 1.3 6.9L12 17.4l-6.2 3.4 1.3-6.9L2 9.1l7-.9z" fill="#ffc933" stroke="#d99a00" stroke-width="1.2" stroke-linejoin="round"/>' : '') + '</svg>';
  /* badge selon la note : coupe d'or, médaille d'argent, médaille de bronze, ou fusée d'encouragement */
  function badge(note) {
    const lv = note >= 16 ? ['#ffd700', '#b8860b', 'Expert !'] : note >= 12 ? ['#d8dde6', '#8a93a3', 'Très bien !'] : note >= 8 ? ['#e3a46b', '#9a5b2c', 'Bon travail !'] : ['#9cc2ff', '#3d7bff', 'Continue !'];
    const [c, d] = lv;
    const body = note >= 16
      ? '<path d="M30 18h40v22c0 14-9 24-20 24S30 54 30 40z" fill="' + c + '" stroke="' + d + '" stroke-width="3"/><path d="M30 24H18c0 14 6 20 14 21M70 24h12c0 14-6 20-14 21" fill="none" stroke="' + d + '" stroke-width="4"/>'
        + '<rect x="44" y="62" width="12" height="12" fill="' + d + '"/><rect x="32" y="74" width="36" height="10" rx="3" fill="' + c + '" stroke="' + d + '" stroke-width="3"/><path d="M42 30l4 8 9 1-6 6 2 9-9-4-8 4 2-9-6-6 9-1z" fill="#fff" opacity=".85"/>'
      : note >= 8
        ? '<path d="M36 6l14 26 14-26" fill="none" stroke="#3d7bff" stroke-width="8"/><path d="M40 6l10 22 10-22" fill="none" stroke="#ef476f" stroke-width="4"/>'
          + '<circle cx="50" cy="58" r="26" fill="' + c + '" stroke="' + d + '" stroke-width="4"/><circle cx="50" cy="58" r="17" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/><path d="M50 45l4 8 9 1-6.5 6 1.6 9L50 64.6 41.9 69l1.6-9L37 54l9-1z" fill="#fff" opacity=".9"/>'
        : '<path d="M50 6c14 12 16 34 10 54H40C34 40 36 18 50 6z" fill="#f2f4f8" stroke="#8b8fa3" stroke-width="3"/><circle cx="50" cy="30" r="7" fill="' + c + '" stroke="#8b8fa3" stroke-width="2"/><path d="M38 46l-12 16h12zM62 46l12 16H62z" fill="#ef476f"/><path d="M42 60q8 26 16 0z" fill="#ffb703"/>';
    return { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 92" width="400" height="368">' + body + '</svg>', label: lv[2] };
  }

  async function pdf(sm, nm) {
    const { jsPDF } = await loadPdfLib();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const clean = (t) => String(t).replace(/[’‘]/g, "'").replace(/[^\x20-\xFF«»œŒ€]/g, '');
    const L = 18, R = 192;
    // images (si une image ne peut pas être créée, le bilan est fait sans elle)
    const I = root.GuideIntro || {};
    const bdg = badge(sm.note20);
    const [imgBot, imgPoster, imgBadge, sFull, sHalf, sEmpty] = await Promise.all([
      I.robotFace ? svgToPng(I.robotFace(), 300, 260) : null,
      I.poster && I.poster(sm.id) ? svgToPng(I.poster(sm.id), 1200, 360) : null,
      svgToPng(bdg.svg, 400, 368), svgToPng(STAR('full'), 96, 96), svgToPng(STAR('half'), 96, 96), svgToPng(STAR(''), 96, 96)]);
    const img = (data, x, y, w, h) => { if (data) try { doc.addImage(data, 'PNG', x, y, w, h); } catch (e) {} };
    // bandeau
    doc.setFillColor(52, 179, 74); doc.rect(0, 0, 210, 28, 'F');
    doc.setFillColor(255, 201, 51); doc.rect(0, 28, 210, 1.6, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text("L'atelier du codeur", L, 13);
    doc.setFontSize(12); doc.setFont('helvetica', 'normal');
    doc.text(clean('Bilan du parcours guidé « ' + sm.course + ' »'), L, 21);
    if (imgBot) { doc.setFillColor(255, 255, 255); doc.circle(181, 14, 11.5, 'F'); img(imgBot, 171.5, 6.2, 19, 16.5); }
    doc.setTextColor(20, 33, 61);
    doc.setFontSize(12);
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.setFont('helvetica', 'bold'); doc.text('Élève :', L, 40); doc.setFont('helvetica', 'normal'); doc.text(clean(nm), L + 18, 40);
    doc.setFont('helvetica', 'bold'); doc.text('Date :', L, 47); doc.setFont('helvetica', 'normal'); doc.text(date, L + 18, 47);
    // badge + note
    img(imgBadge, 112, 33, 21, 19.3);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(122, 90, 0);
    doc.text(bdg.label, 122.5, 56.5, { align: 'center' });
    doc.setDrawColor(52, 179, 74); doc.setLineWidth(0.8); doc.setFillColor(244, 255, 250); doc.roundedRect(138, 34, 54, 22, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(26, 111, 62);
    doc.text(fmt(sm.note20) + ' / 20', 165, 47, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(fmt(sm.total) + ' points sur ' + sm.max, 165, 53, { align: 'center' });
    doc.setTextColor(20, 33, 61);
    // illustration du parcours
    let y = 62;
    if (imgPoster) {
      img(imgPoster, L, y, R - L, (R - L) * 120 / 400);
      doc.setDrawColor(185, 234, 214); doc.setLineWidth(0.6); doc.roundedRect(L, y, R - L, (R - L) * 120 / 400, 2, 2);
      y += (R - L) * 120 / 400 + 12;
    } else y += 6;
    // tableau
    const cols = [L, L + 9, L + 70, L + 100, L + 121, L + 142, L + 160];
    doc.setFillColor(233, 251, 244); doc.rect(L, y - 6, R - L, 13, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    ['N°', 'Mission', 'Résultat', 'Indices', 'Erreurs', 'Étoiles', 'Points'].forEach((t, i) => doc.text(t, cols[i] + 2, y));
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(93, 106, 130);
    doc.text('(pts perdus)', cols[3] + 2, y + 4); doc.text('(pts perdus)', cols[4] + 2, y + 4);
    doc.setTextColor(20, 33, 61); doc.setFontSize(10);
    y += 4;
    const lostTxt = (n, l) => n + (l > 0 ? '  (-' + fmt(l) + ')' : '');
    for (const m of sm.missions) {
      const title = doc.splitTextToSize(clean(m.title), 58);
      const h = Math.max(1, title.length) * 5 + 4;
      y += 3;
      doc.setDrawColor(220, 226, 236); doc.setLineWidth(0.2); doc.line(L, y, R, y);
      y += 6;
      doc.text(String(m.n), cols[0] + 2, y);
      doc.text(title, cols[1] + 2, y);
      if (m.done && !m.solution) doc.setTextColor(26, 111, 62); else if (!m.done) doc.setTextColor(163, 32, 63); else doc.setTextColor(160, 90, 0);
      doc.text(m.done ? (m.solution ? 'Avec la solution' : 'Réussie') : 'Pas réussie', cols[2] + 2, y);
      doc.setTextColor(20, 33, 61);
      doc.setTextColor(m.lost.hints > 0 ? 160 : 20, m.lost.hints > 0 ? 90 : 33, m.lost.hints > 0 ? 0 : 61);
      doc.text(lostTxt(m.hints, m.lost.hints), cols[3] + 2, y);
      doc.setTextColor(m.lost.fails > 0 ? 163 : 20, m.lost.fails > 0 ? 32 : 33, m.lost.fails > 0 ? 63 : 61);
      doc.text(lostTxt(m.fails, m.lost.fails), cols[4] + 2, y);
      doc.setTextColor(20, 33, 61);
      for (let k = 0; k < 3; k++) { const f = m.points - k; img(f >= 1 ? sFull : f >= 0.5 ? sHalf : sEmpty, cols[5] + 1 + k * 5.4, y - 4.2, 4.8, 4.8); }   // 1 étoile = 1 point
      doc.text(fmt(m.points) + ' / 3', cols[6] + 2, y);
      y += h - 9;
    }
    y += 3; doc.setDrawColor(20, 33, 61); doc.setLineWidth(0.4); doc.line(L, y, R, y);
    y += 7; doc.setFont('helvetica', 'bold');
    const sumH = sm.missions.reduce((t, m) => t + m.hints, 0), sumF = sm.missions.reduce((t, m) => t + m.fails, 0);
    doc.text('Total', cols[1] + 2, y); doc.text(sm.done + ' / ' + sm.missions.length + ' réussies', cols[2] + 2, y);
    doc.text(lostTxt(sumH, sm.lost.hints), cols[3] + 2, y); doc.text(lostTxt(sumF, sm.lost.fails), cols[4] + 2, y);
    doc.text(fmt(sm.total) + ' / ' + sm.max, cols[6] + 2, y);
    // d'où viennent les points perdus ?
    y += 10;
    const lostAll = sm.lost.hints + sm.lost.fails + sm.lost.solution;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.setFillColor(255, 247, 230); doc.setDrawColor(245, 200, 120); doc.setLineWidth(0.4);
    doc.roundedRect(L, y - 5, R - L, 16, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setTextColor(160, 88, 26);
    doc.text(lostAll > 0 ? 'Points perdus sur les missions terminées : ' + fmt(lostAll) : sm.done ? 'Aucun point perdu : bravo !' : 'Aucune mission réussie pour l\'instant.', L + 4, y + 0.5);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 33, 61);
    const parts = [['indices', sm.lost.hints], ['erreurs', sm.lost.fails], ['solution affichée', sm.lost.solution]].filter((x) => x[1] > 0);
    doc.text(lostAll > 0 ? parts.map((x) => fmt(x[1]) + (x[0] === 'solution affichée' ? ' à cause de la ' : ' à cause des ') + x[0]).join('   ·   ')
      : sm.done ? 'Pas d\'indice demandé, pas d\'erreur : du premier coup !' : 'Les points perdus à cause des indices et des erreurs s\'afficheront ici.', L + 4, y + 7);
    y += 18; doc.setFontSize(9.5); doc.setTextColor(93, 106, 130);
    doc.text('Barème par mission : 3 points du premier coup ; chaque indice ou chaque erreur enlève un cran : 2, 1,5, 1, puis 0.', L, y);
    doc.text('0 point si la solution a été affichée. Une étoile = un point. Erreur = « Valide ta mission » sans réussir.', L, y + 5); y += 5;
    doc.text('Note sur 20 = points obtenus / ' + sm.max + ' x 20 (arrondie au demi-point).', L, y + 5);
    doc.setFillColor(52, 179, 74); doc.rect(0, 290, 210, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8.5);
    doc.text(clean('Bilan créé le ' + date + ' par L\'atelier du codeur.'), L, 294.6);
    const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    doc.save('bilan-' + slug(sm.course) + '-' + slug(nm) + '.pdf');
  }

  /* Écran de choix du parcours */
  function picker() {
    if (busy) return;
    o.sim.stop();
    course = null; GuideMode.course = null; state = null;   // plus de mission en cours : rien n'est enregistré
    o.ws.updateToolbox(reducedToolbox(['arduino_setup', 'arduino_loop']));
    o.loadState(root.GuideKit ? root.GuideKit.empty() : { board: 'nano', blocks: { languageVersion: 0, blocks: [] } });
    panel.innerHTML = '';
    panel.classList.remove('gbar'); panel.classList.add('gpick');
    progressSlot().hidden = true;
    missionTitle('');   // le choix du parcours s'affiche en grand, au milieu de l'écran
    panel.appendChild(el('h3', { class: 'gtitle', text: 'Choisis un parcours' }));
    const sayBox = el('div', { class: 'gsay' });
    const src = document.getElementById('mascot');
    if (src) { const mc = src.cloneNode(true); mc.removeAttribute('id'); mc.setAttribute('class', 'mascot gmascot'); mc.setAttribute('data-mood', 'happy'); sayBox.appendChild(mc); }
    sayBox.appendChild(el('div', { class: 'gbubble', text: 'Chaque parcours est une suite de missions, de la plus facile à la plus difficile. Par lequel veux-tu commencer ?' }));
    panel.appendChild(sayBox);
    const LEVELS = [['initiation', '🌱 Initiation'], ['5e', '5e'], ['4e', '4e'], ['3e', '3e'], ['plus', 'Pour aller plus loin']];
    const grid = el('div', { class: 'gcourses' });
    const order = [];
    for (const [lv, label] of LEVELS) {
      const list = courses.filter((c) => (c.level || 'plus') === lv);
      if (!list.length) continue;
      order.push(el('h4', { class: 'glevel', text: label }));
      order.push(...list);
    }
    for (const c of order) {
      if (c instanceof root.Element) { grid.appendChild(c); continue; }
      const st = loadState(c);
      const done = c.missions.filter((m) => (st.missions[m.id] || {}).done).length;
      const pts0 = c.missions.reduce((t, m) => { const s2 = st.missions[m.id]; return t + (s2 && s2.done ? s2.points || 0 : 0); }, 0);
      grid.appendChild(el('button', { type: 'button', class: 'gcourse' + (done === c.missions.length ? ' finished' : ''), 'data-course': c.id, onclick: () => choose(c.id) }, [
        el('span', { class: 'gcicon', text: c.icon || '🎯' }),
        el('span', { class: 'gctext' }, [el('b', { text: c.title }), el('small', { text: c.description || '' }),
          el('em', { text: c.missions.length + ' missions · ' + (done ? done + ' réussie' + (done > 1 ? 's' : '') + ' · ' + fmt(pts0) + ' / ' + c.missions.length * 3 + ' points' : 'pas encore commencé') })]),
      ]));
    }
    panel.appendChild(grid);
    say('happy', 'Choisis un parcours dans la fenêtre !');
  }
  function choose(id) {
    const c = courses.find((x) => x.id === id) || courses[0];
    course = c;
    GuideMode.course = c;
    state = loadState(c);
    if (!reachable(state.cur)) state.cur = Math.min(firstUndone(), c.missions.length - 1);
    loadMissionProgram();
    render(true);
    o.showTab('sim');
    say('happy', 'Parcours « ' + c.title + ' » ! Lis la mission dans le bandeau en haut. « Détails » t\'explique tout, et tu peux demander un indice à tout moment.');
    if (root.GuideIntro) root.GuideIntro.play(c.id, c.title);   // petite animation de présentation du parcours
  }
  function enter(courseId) {
    if (GuideMode.active) return;
    safe(() => localStorage.setItem(LIBRE, JSON.stringify(o.snapshot())));
    GuideMode.active = true;
    document.body.classList.add('guided');
    o.button.classList.add('on');
    o.button.querySelector('span').textContent = 'Mode guidé ▾';
    if (o.locked) { o.button.hidden = true; o.button.style.display = 'none'; }   // parcours imposé (plateforme) : pas de changement de parcours
    o.setBoard('nano');
    if (home.parent && o.barAfter) o.barAfter.after(panel);
    buddyIn(true);   // les consignes vont dans le bandeau, à droite des boutons
    panel.hidden = false;
    if (courseId) choose(courseId); else picker();
  }
  function exit() {
    if (!GuideMode.active || busy) return;
    closeStage();
    o.sim.stop();
    GuideMode.active = false;
    document.body.classList.remove('guided');
    o.button.classList.remove('on');
    o.button.querySelector('span').textContent = 'Mode guidé';
    panel.hidden = true;
    panel.classList.remove('gbar', 'gpick', 'gfin');
    progressSlot().hidden = true;
    missionTitle('');
    buddyIn(false);
    { const sc = document.querySelector('.gscorebubble'); if (sc) sc.remove(); }
    if (home.parent) home.parent.insertBefore(panel, home.next);
    relayout();
    o.ws.updateToolbox(o.fullToolbox);
    const libre = safe(() => JSON.parse(localStorage.getItem(LIBRE)));
    if (libre) o.loadState(libre);
    say('idle', 'Retour au mode libre : ton programme est de retour.');
  }
  /* Appelé à chaque modification : le programme de la mission est mémorisé. */
  function saveProgram(snapshot) {
    if (!GuideMode.active || !course || !state) return;
    const m = mission();
    const s = state.missions[m.id] = state.missions[m.id] || {};
    s.program = snapshot;
    store();
  }

  const GuideMode = {
    active: false,
    /* options : ws, sim, fullToolbox, loadState, snapshot, showTab, say, log, setBoard, panel, button, course, key */
    course: null,
    init(opts) {
      o = opts; courses = opts.courses || [opts.course]; panel = opts.panel;
      home = { parent: panel.parentNode, next: panel.nextSibling };
      root.addEventListener('resize', () => { if (GuideMode.active) placeUnder(); });
      const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      o.button.onclick = () => (GuideMode.active ? (busy || o.locked ? null : toggleMenu()) : enter());
    },
    enter: enter, exit: exit, saveProgram: saveProgram, goTo: (i, force) => goTo(i, force), choose: (id) => choose(id), picker: () => picker(),
    get courses() { return courses; },
    summary: () => (course && state ? summary() : null),
    report: () => report(),
    bilanPdf: (nm) => (course && state ? pdf(summary(), nm || 'Élève') : null),
    get mission() { return course && state ? mission() : null; },
    get busy() { return busy; },
  };
  root.GuideMode = GuideMode;
})(typeof window !== 'undefined' ? window : globalThis);
