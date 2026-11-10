import json
import queue
import threading
import tkinter as tk
from tkinter import ttk, messagebox
from ai_chat import PrivateChatStore, request_reply, endpoint_url, import_personal_chat
from free_ai import SharedChatStore, import_shared_chat, shared_reply, login_shared, valid_credential, shared_quota
from PIL import Image,ImageTk
from chat_art import frame_image
from tkinter import font as tkfont


def text_color(hex_color):
    rgb=[int(hex_color[i:i+2],16)/255 for i in (1,3,5)]
    return '#152b27' if sum(a*b for a,b in zip(rgb,(.2126,.7152,.0722)))>.58 else '#ffffff'


class ChatWindow:
    def __init__(self, parent, bundle, config, responses):
        self.responses=responses
        self.store=PrivateChatStore(bundle)
        self.settings=dict(config.get('chat') or {})
        self.import_error=''
        try:saved=import_personal_chat(bundle,self.store) or self.store.load()
        except (ValueError,OSError):
            saved=self.store.load();self.import_error='个人模型配置未能导入，请在设置中检查。'
        self.settings.update(saved.get('settings') or {})
        self.key=saved.get('key','')
        self.shared_store=SharedChatStore(bundle)
        try:self.shared=import_shared_chat(bundle,self.shared_store)
        except (ValueError,OSError):self.shared={}
        self.auth_results=queue.Queue()
        self.quota_results=queue.Queue();self.free_remaining=None
        self.remember=bool(self.key)
        self.history=[]
        self.messages=[];self.message_widgets=[];self.art=None
        self.busy=False
        self.results=queue.Queue()
        self.generation=0
        self.window=tk.Toplevel(parent)
        appearance=self.settings.get('appearance') or {}
        self.window.title(str(appearance.get('title') or '和桌宠聊聊')[:32])
        width=max(300,min(560,int(appearance.get('width') or 380)))
        self.window.geometry(f'{width}x500')
        self.window.minsize(300,350)
        try:
            themes=json.loads((bundle/'assets/chat-themes.json').read_text(encoding='utf8'))
        except (OSError,ValueError):
            themes=[dict(id='glass-1',name='薄荷玻璃',bg='#e6f6f2',fg='#193f39',accent='#387d70',borderWidth=1,kind='glass')]
        self.theme=next((t for t in themes if t['id']==appearance.get('theme')),themes[0])
        art_path=self.theme.get('art','')
        if art_path.startswith('assets/chat-frames/') and '..' not in art_path:
            try:self.art=Image.open(bundle/art_path).convert('RGBA')
            except OSError:pass
        def color(value,fallback):
            return value if isinstance(value,str) and len(value)==7 and value[0]=='#' and all(c in '0123456789abcdefABCDEF' for c in value[1:]) else fallback
        self.bg=color(appearance.get('background'),self.theme['bg'])
        self.fg=self.theme['fg']
        self.accent=color(appearance.get('accent'),self.theme['accent'])
        font=max(12,min(20,int(appearance.get('fontSize') or 14)))
        family='Consolas' if self.theme.get('font')=='mono' else 'Microsoft YaHei UI'
        self.message_font=tkfont.Font(family=family,size=font)
        self.window.configure(bg=self.accent)
        stroke=self.theme.get('borderWidth',1)
        self.surface=tk.Frame(self.window,bg=self.bg,bd=stroke,relief='groove' if self.theme.get('kind') in ('frame','retro') else 'flat')
        self.surface.pack(fill='both',expand=True,padx=stroke,pady=stroke)
        header=tk.Frame(self.surface,bg=self.accent,padx=12,pady=10)
        header.pack(fill='x')
        tk.Label(header,text=self.window.title(),bg=self.accent,fg=text_color(self.accent),font=(family,12,'bold')).pack(side='left')
        tk.Button(header,text='设置',command=self.configure_chat,bg=self.accent,fg=text_color(self.accent),relief='flat').pack(side='right')
        self.mode=tk.StringVar(value={'byok':'自己的模型 / Agent','free':'免费 AI（工作室额度）'}.get(self.settings.get('mode'),'基础陪伴（本地）'))
        chooser=ttk.Combobox(self.surface,textvariable=self.mode,values=['免费 AI（工作室额度）','基础陪伴（本地）','自己的模型 / Agent'],state='readonly')
        chooser.pack(fill='x',padx=12,pady=(12,4));chooser.bind('<<ComboboxSelected>>',self.change_mode)
        self.free_login=ttk.Button(self.surface,text='登录免费 AI',command=self.configure_free)
        self.free_login.pack(fill='x',padx=12,pady=3)
        self.note=tk.Label(self.surface,bg=self.bg,fg=self.fg,justify='left',wraplength=width-35,font=(family,9))
        self.note.pack(fill='x',padx=12,pady=4)
        self.log=tk.Text(self.surface,wrap='word',state='disabled',bg=self.bg,fg=self.fg,relief='flat',padx=14,pady=10,font=(family,font),insertbackground=self.fg)
        self.log.tag_configure('who',foreground=self.accent,font=(family,10,'bold'))
        self.log.pack(fill='both',expand=True)
        self.log.bind('<Configure>',self.resize_messages)
        self.resize_id=None
        compose=tk.Frame(self.surface,bg=self.bg,padx=12,pady=12);compose.pack(fill='x')
        self.input=tk.Entry(compose,font=(family,11),bg=self.bg,fg=self.fg,insertbackground=self.fg,relief='solid',bd=1)
        self.input.pack(side='left',fill='x',expand=True,ipady=8);self.input.bind('<Return>',lambda _:self.send())
        self.send_button=tk.Button(compose,text='发送',command=self.send,bg=self.accent,fg=text_color(self.accent),relief='flat',padx=12,pady=7)
        self.send_button.pack(side='right',padx=(7,0))
        self.refresh_note()
        self.append('桌宠','我在这里。想聊点什么？')
        if self.import_error:self.append('连接提示',self.import_error)
        self.poll_id=self.window.after(100,self.poll)
        self.window.protocol('WM_DELETE_WINDOW',self.close)
        self.input.focus_set()
        self.refresh_free_quota()

    def refresh_note(self):
        self.note.configure(text=('免费 AI：消息经工作室转交豆包。每账号每天20次、每分钟3次，北京时间00:00重置。'+(f' 今日剩余 {self.free_remaining}/20 次。' if self.free_remaining is not None else '')+(' 已绑定；全站赠额用完即停。' if valid_credential(self.shared) else ' 请先登录绑定。')) if self.settings.get('mode')=='free' else ('自带 Key：消息直接发往 '+str(self.settings.get('endpoint','未配置'))+'；费用由你的模型账户承担。') if self.settings.get('mode')=='byok' else '基础陪伴：使用内置回复库，不联网、不调用模型。')

    def change_mode(self,_event=None):
        self.settings['mode']={'自己的模型 / Agent':'byok','免费 AI（工作室额度）':'free'}.get(self.mode.get(),'basic')
        self.generation+=1;self.history=[];self.refresh_note()
        self.refresh_free_quota()

    def refresh_free_quota(self):
        if self.settings.get('mode')!='free' or not valid_credential(self.shared):return
        credential=dict(self.shared)
        def worker():
            try:self.quota_results.put(shared_quota(credential))
            except ValueError:pass
        threading.Thread(target=worker,daemon=True).start()

    def append(self,who,text):
        self.messages=(self.messages+[(who,str(text))])[-20:]
        self.render_messages()

    def resize_messages(self,event=None):
        if self.resize_id:self.window.after_cancel(self.resize_id)
        self.resize_id=self.window.after(100,self.render_messages)

    def render_messages(self):
        self.resize_id=None
        self.log.configure(state='normal')
        for widget in self.message_widgets:widget.destroy()
        self.message_widgets=[];self.log.delete('1.0','end')
        for who,text in self.messages:
            if self.art:
                width=max(220,self.log.winfo_width()-34);wrap=width-132
                canvas=tk.Canvas(self.log,width=width,height=110,bg=self.bg,highlightthickness=0,bd=0)
                content=canvas.create_text(74,40,text=who+'\n'+text,anchor='nw',width=wrap,fill=self.fg,font=self.message_font)
                bounds=canvas.bbox(content);height=max(110,bounds[3]+38)
                canvas.configure(height=height)
                photo=ImageTk.PhotoImage(frame_image(self.art,width,height,self.bg))
                canvas.photo=photo;canvas.create_image(0,0,image=photo,anchor='nw');canvas.tag_raise(content)
                self.log.window_create('end',window=canvas,padx=0,pady=4)
                self.log.insert('end','\n');self.message_widgets.append(canvas)
            else:
                self.log.insert('end',who+'\n','who');self.log.insert('end',text+'\n\n')
        self.log.configure(state='disabled');self.log.see('end')

    def send(self):
        text=self.input.get().strip()[:4000]
        if not text or self.busy:return
        if self.settings.get('mode')=='free' and len(text)>1000:
            self.append('提示','免费 AI 每条提问最多1000字，请缩短后重试。');return
        if self.settings.get('mode')=='byok' and not self.key:
            self.configure_chat();return
        if self.settings.get('mode')=='free' and not valid_credential(self.shared):
            self.configure_free();return
        self.input.delete(0,'end');self.append('你',text)
        if self.settings.get('mode') not in ('byok','free'):
            self.append('桌宠',self.responses.reply(text));return
        self.busy=True;self.send_button.configure(state='disabled');self.note.configure(text='正在等模型回复… 可以继续移动或操作桌宠。')
        generation=self.generation;settings=dict(self.settings);key=self.key;credential=dict(self.shared);history=self.history+[dict(role='user',content=text)]
        def worker():
            try:self.results.put((generation,text,shared_reply(credential,history,on_quota=self.quota_results.put) if settings.get('mode')=='free' else request_reply(settings,key,history),None))
            except Exception as error:self.results.put((generation,text,None,str(error) if isinstance(error,ValueError) else '模型连接失败，请检查设置后重试。'))
        threading.Thread(target=worker,daemon=True).start()

    def poll(self):
        try:
            quota=self.quota_results.get_nowait();self.free_remaining=quota.get('remaining');self.refresh_note()
        except queue.Empty:pass
        try:
            credential,error=self.auth_results.get_nowait()
            self.auth_busy=False
            if error:self.append('登录提示',error)
            else:
                try:self.shared_store.save(credential);self.shared=credential
                except OSError:self.append('登录提示','Windows 无法加密保存绑定，请稍后重试。')
                else:
                    self.free_remaining=credential.get('quota',{}).get('remaining');self.settings['mode']='free';self.mode.set('免费 AI（工作室额度）');self.generation+=1;self.history=[];self.refresh_note();self.append('桌宠','免费 AI 已绑定，可以开始聊啦。')
        except queue.Empty:pass
        try:
            generation,text,answer,error=self.results.get_nowait()
            self.busy=False;self.send_button.configure(state='normal');self.refresh_note()
            if generation==self.generation:
                if error:self.append('连接提示',error);self.refresh_free_quota()
                else:
                    self.history=(self.history+[dict(role='user',content=text),dict(role='assistant',content=answer)])[-12:]
                    self.append('桌宠',answer)
        except queue.Empty:pass
        self.poll_id=self.window.after(100,self.poll)

    def configure_free(self):
        if getattr(self,'auth_busy',False):return
        current=getattr(self,'free_panel',None)
        if current and current.winfo_exists():current.lift();return
        panel=tk.Toplevel(self.window);self.free_panel=panel;panel.title('登录免费 AI');panel.geometry('410x330')
        form=ttk.Frame(panel,padding=20);form.pack(fill='both',expand=True)
        ttk.Label(form,text='使用 PET FORGE 网站账号登录，免费 AI 每人每天20次。\n消息将经工作室发送给豆包；赠额用完即停止。',wraplength=360).pack(anchor='w',pady=8)
        email=tk.StringVar();password=tk.StringVar()
        for label,value,mask in [('注册邮箱',email,''),('网站密码',password,'•')]:
            ttk.Label(form,text=label).pack(anchor='w',pady=(10,4));ttk.Entry(form,textvariable=value,show=mask).pack(fill='x',ipady=5)
        def start():
            address=email.get();secret=password.get()
            if not address or not secret:return
            password.set('');panel.destroy();self.auth_busy=True;self.append('连接提示','正在绑定免费 AI…')
            def worker():
                try:self.auth_results.put((login_shared(address,secret),None))
                except Exception as error:self.auth_results.put((None,str(error) if isinstance(error,ValueError) else '登录失败，请稍后重试。'))
            threading.Thread(target=worker,daemon=True).start()
        ttk.Button(form,text='登录并绑定',command=start).pack(fill='x',pady=20)

    def configure_chat(self):
        current=getattr(self,'settings_window',None)
        if current and current.winfo_exists():current.lift();return
        panel=tk.Toplevel(self.window);self.settings_window=panel;panel.title('自己的模型 / Agent');panel.geometry('470x510');panel.minsize(360,460)
        form=ttk.Frame(panel,padding=18);form.pack(fill='both',expand=True)
        values={}
        for label,name,default in [('接口地址（HTTPS）','endpoint','https://api.deepseek.com/chat/completions'),('模型名称 / Agent ID','model','deepseek-flash'),('自己的 API Key','key',self.key),('说话设定','prompt','')]:
            ttk.Label(form,text=label).pack(anchor='w',pady=(10,4))
            var=tk.StringVar(value=self.key if name=='key' else str(self.settings.get(name) or default));values[name]=var
            ttk.Entry(form,textvariable=var,show='•' if name=='key' else '').pack(fill='x',ipady=5)
        remember=tk.BooleanVar(value=self.remember)
        ttk.Checkbutton(form,text='仅在本机加密记住（Windows 账户保护）',variable=remember).pack(anchor='w',pady=12)
        ttk.Label(form,text='兼容 Chat Completions。个人下载包可能包含 Key，公开作品不会包含。\n可在本机加密记住；不勾选则退出后清除。',wraplength=410,justify='left').pack(anchor='w')
        def save():
            settings={**self.settings,'mode':'byok','endpoint':values['endpoint'].get().strip(),'model':values['model'].get().strip(),'prompt':values['prompt'].get().strip()[:1200]}
            secret=values['key'].get().strip()
            try:
                settings['endpoint']=endpoint_url(settings['endpoint'])
                if not settings['model'] or len(settings['model'])>160 or not secret or len(secret)>4096 or '\n' in secret or '\r' in secret:raise ValueError('请填写有效的模型名称和 API Key。')
                if remember.get():self.store.save({'settings':settings,'key':secret})
                else:self.store.forget()
            except (ValueError,OSError) as error:messagebox.showerror('未保存',str(error),parent=panel);return
            self.settings=settings;self.key=secret;self.remember=remember.get();self.mode.set('自己的模型 / Agent');self.generation+=1;self.history=[];self.refresh_note();panel.destroy()
        def forget():
            try:self.store.forget()
            except OSError:messagebox.showerror('未清除','无法删除本机加密文件，请检查权限。',parent=panel);return
            self.key='';self.remember=False;self.generation+=1;self.history=[];values['key'].set('');remember.set(False)
        actions=ttk.Frame(form);actions.pack(fill='x',pady=18)
        ttk.Button(actions,text='清除本机 Key',command=forget).pack(side='left');ttk.Button(actions,text='保存并使用',command=save).pack(side='right')

    def close(self):
        self.generation+=1;self.key='';self.history=[]
        self.window.after_cancel(self.poll_id)
        if self.resize_id:self.window.after_cancel(self.resize_id)
        self.window.destroy()
