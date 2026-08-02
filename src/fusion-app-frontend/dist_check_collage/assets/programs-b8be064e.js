import{s as u,f,e as p,o as b}from"./index-29c64bdd.js";function v(t,o){return{imageSrc:b(o==null?void 0:o.imageSrc,t==null?void 0:t.imageSrc),routeLink:t.routeLink,en:{focus:t.focus||"",imageAlt:t.focus||t.imageAlt||"Program",location:t.location,season:`${t.startDate} - ${t.endDate}`,year:t.year,briefDescription:t.briefDescription||"",totalSlots:t.totalSlots||0,availableSlots:t.availableSlots||0,cta:"Learn More"},ja:{focus:o.focus||"",imageAlt:o.focus||o.imageAlt||"プログラム",location:o.location,season:`${o.startDate} - ${o.endDate}`,year:o.year,briefDescription:o.briefDescription||"",totalSlots:o.totalSlots||0,availableSlots:o.availableSlots||0,cta:"詳細を見る"}}}function S(){return`
        <div class="page programs-page">
            <main id="programsMain" class="main-cont">
                <div id="programsMainContent" class="feed-container">
                    <h1 class="seo-primary-h1">Japan artist residency programs</h1>
                    <div id="programsBlocks"></div>
                </div>
            </main>
        </div>
    `}let r=null;function y(){console.log("Programs page initialized"),r&&(r(),r=null);const t=async()=>{var n,l;const o=document.getElementById("programsBlocks");if(!o)return;o.innerHTML="";const e=f(await p()),a=((n=e==null?void 0:e.programs)==null?void 0:n.en)||[],g=((l=e==null?void 0:e.programs)==null?void 0:l.ja)||[];for(let s=0;s<a.length;s++){const c=a[s],m=g[s]||c,i=document.createElement("app-program-block");i.setAttribute("active","true"),i.setAttribute("layout",s%2===0?"left":"right"),typeof i.setProgramBlock=="function"&&i.setProgramBlock(v(c,m)),o.appendChild(i)}};t(),r=u(()=>{t()})}function D(){return console.log("Programs content generated"),S()}export{y as default,D as generateProgramsContent,S as render};
