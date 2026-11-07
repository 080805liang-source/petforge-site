(function () {
  const rows = [
    ["如何切换阴影和动态模式？", "How do I change shadows and animation?", "影と動作モードの切り替え方法は？", "Come cambio ombra e animazione?", "¿Cómo cambio la sombra y la animación?", "Comment modifier l’ombre et l’animation ?"],
    ["创作台默认静态、无阴影。可勾选“柔和阴影”或“动态桌宠”，再生成桌宠包；运行后也可在右键菜单切换并保存。已下载的旧版本需要重新生成下载。", "The studio defaults to static with no shadow. Select Soft shadow or Animated pet before generating. You can also change and save them from the pet’s right-click menu. Generate and download again to replace older versions.", "初期設定は静止・影なしです。生成前に影や動作を選べます。実行後は右クリックメニューでも変更・保存できます。旧版は再生成してダウンロードしてください。", "Lo studio parte statico e senza ombra. Seleziona ombra o animazione prima di generare; puoi cambiarle e salvarle anche dal menu destro del pet. Rigenera e scarica per sostituire le vecchie versioni.", "El estudio empieza estático y sin sombra. Elige sombra o animación antes de generar; también puedes cambiarlo y guardarlo desde el menú derecho. Genera y descarga de nuevo para reemplazar versiones antiguas.", "L’atelier est statique et sans ombre par défaut. Choisissez l’ombre ou l’animation avant de générer ; vous pouvez aussi les modifier et enregistrer par clic droit. Régénérez et téléchargez pour remplacer les anciennes versions."],
    ["动态模式以 60 帧/秒为目标，实际流畅度取决于电脑性能。静态模式保留拖动、气泡和快捷入口。", "Animation targets 60 fps; actual smoothness depends on your computer. Static mode retains dragging, bubbles, and shortcuts.", "動作の目標は60fpsで、実際の滑らかさはパソコンによります。静止時もドラッグ、吹き出し、ショートカットは使えます。", "L’animazione punta a 60 fps; la fluidità dipende dal computer. La modalità statica mantiene trascinamento, fumetti e scorciatoie.", "La animación busca 60 fps; la fluidez depende del equipo. El modo estático conserva arrastre, burbujas y accesos.", "L’animation vise 60 images/s ; la fluidité dépend de l’ordinateur. Le mode statique conserve déplacement, bulles et raccourcis."],
    ["柔和阴影（可选）", "Soft shadow (optional)", "柔らかな影（任意）", "Ombra morbida (opzionale)", "Sombra suave (opcional)", "Ombre douce (facultative)"],
    ["动态桌宠 · 60 帧/秒", "Animated pet · 60 fps", "動くペット · 60 fps", "Pet animato · 60 fps", "Mascota animada · 60 fps", "Compagnon animé · 60 images/s"],
    ["默认静态、无阴影。开启动态后播放互动动作；关闭后保留拖动、气泡和快捷入口。", "Static with no shadow by default. Enable animation for motion effects; dragging, bubbles, and shortcuts remain available when off.", "初期設定は静止・影なしです。動作を有効にするとアニメーションを再生します。無効でもドラッグ、吹き出し、ショートカットは使えます。", "Statico e senza ombra per impostazione predefinita. Attiva l’animazione per i movimenti; trascinamento, fumetti e scorciatoie restano disponibili quando è disattivata.", "Estática y sin sombra por defecto. Activa la animación para los movimientos; arrastrar, burbujas y accesos siguen disponibles al desactivarla.", "Statique et sans ombre par défaut. Activez l’animation pour les mouvements ; le déplacement, les bulles et les raccourcis restent disponibles sans animation."],
    ["我的会员", "My membership", "会員情報", "Il mio abbonamento", "Mi membresía", "Mon abonnement"],
    ["激活会员", "Activate membership", "会員を有効化", "Attiva abbonamento", "Activar membresía", "Activer l’abonnement"],
    ["会员未激活", "Membership inactive", "会員未有効", "Abbonamento non attivo", "Membresía inactiva", "Abonnement inactif"],
    ["兑换后激活会员，有效期内不限生成次数。", "Redeem a code to activate unlimited pet generation for its membership term.", "コードを引き換えると、有効期間中はペットを無制限で生成できます。", "Riscatta un codice per creare pet senza limiti durante l’abbonamento.", "Canjea un código para generar mascotas sin límite durante la membresía.", "Échangez un code pour générer des compagnons sans limite pendant la durée de l’abonnement."],
    ["会员有效期和续期怎么算？", "How do membership and renewal dates work?", "会員期限と更新の計算方法は？", "Come funzionano durata e rinnovo?", "¿Cómo funcionan la duración y renovación?", "Comment fonctionnent la durée et le renouvellement ?"],
    ["会员从兑换时开始计时，有效期内不限生成次数。提前续期会接在原有效期后，过期后续期则从兑换时重新计算。已有使用次数仍保留，会员有效期内不会扣减。", "Membership starts at redemption with unlimited generation until expiry. Early renewal extends your current term; renewal after expiry starts then. Existing credits are kept and not deducted during membership.", "引き換え時から期限まで無制限です。期限前の更新は現在の期限から延長し、期限後は引き換え時から再開します。既存回数は維持され、有効期間中は消費しません。", "L’abbonamento parte dal riscatto e offre generazioni illimitate. Il rinnovo anticipato prolunga la scadenza; dopo la scadenza riparte dal riscatto. I crediti esistenti restano intatti durante l’abbonamento.", "La membresía empieza al canjear con generaciones ilimitadas. Renovar antes amplía la fecha actual; después de caducar empieza al canjear. Los créditos existentes se conservan y no se descuentan durante la membresía.", "L’abonnement commence à l’échange avec des générations illimitées. Un renouvellement anticipé prolonge la durée actuelle ; après expiration, il repart de l’échange. Les crédits existants restent conservés pendant l’abonnement."],
    ["本次为无限使用权益，未扣次数。桌宠 ZIP 已下载；解压全部文件后即可启动。", "Your unlimited access was used; no credits were deducted. Extract all files from the pet ZIP to start.", "無制限の利用権が適用され、回数は減りません。ZIPの全ファイルを展開して起動してください。", "Accesso illimitato applicato, nessun credito consumato. Estrai tutti i file dallo ZIP per avviare.", "Se aplicó el acceso ilimitado sin descontar créditos. Extrae todos los archivos del ZIP para iniciar.", "L’accès illimité a été utilisé sans débit de crédit. Extrayez tous les fichiers du ZIP pour démarrer."],
    ["登录 / 兑换会员码", "Sign in / redeem code", "ログイン / コード引き換え", "Accedi / riscatta codice", "Entrar / canjear código", "Connexion / échanger un code"],
    ["兑换会员码。", "Redeem your access code.", "会員コードを引き換え。", "Riscatta il tuo codice.", "Canjea tu código.", "Échangez votre code d’accès."],
    ["会员码", "Access code", "会員コード", "Codice di accesso", "Código de acceso", "Code d’accès"],
    ["兑换会员码", "Redeem access code", "会員コードを引き換え", "Riscatta codice", "Canjear código", "Échanger le code"],
    ["输入你已获得的 PAW- 会员码", "Enter your PAW- access code", "取得済みの PAW- コードを入力", "Inserisci il tuo codice PAW-", "Introduce tu código PAW-", "Saisissez votre code PAW-"],
    ["在其他平台获得会员码后，在此兑换。本站不提供支付或购买服务。", "Redeem a code obtained on another platform. This site has no checkout or payment service.", "他のプラットフォームで取得したコードをここで引き換えます。当サイトでの購入・支払いはできません。", "Riscatta qui un codice ottenuto su un’altra piattaforma. Questo sito non offre acquisti o pagamenti.", "Canjea aquí un código obtenido en otra plataforma. Este sitio no ofrece compras ni pagos.", "Échangez ici un code obtenu sur une autre plateforme. Ce site ne propose ni achat ni paiement."],
    ["每生成一次桌宠包消耗 1 次，可兑换会员码补充。", "Each pet package uses 1 credit. Redeem a code to add more.", "ペットの生成で1回分を使用します。コードで追加できます。", "Ogni pacchetto usa 1 credito. Riscatta un codice per aggiungerne.", "Cada paquete usa 1 crédito. Canjea un código para añadir más.", "Chaque compagnon utilise 1 crédit. Échangez un code pour en ajouter."],
    ["请先兑换会员码，再继续使用。", "Redeem an access code to continue.", "会員コードを引き換えて続行してください。", "Riscatta un codice per continuare.", "Canjea un código para continuar.", "Échangez un code pour continuer."],
    ["正在验证会员码…", "Checking your access code…", "会員コードを確認中…", "Verifica del codice…", "Verificando código…", "Vérification du code…"],
    ["兑换成功，权益已加入当前账号。", "Redeemed. Access has been added to this account.", "引き換えました。このアカウントに利用権が追加されました。", "Codice riscattato. Accesso aggiunto a questo account.", "Canjeado. Acceso añadido a esta cuenta.", "Code échangé. Les droits ont été ajoutés à ce compte."],
    ["会员已激活 · 我的账户", "Membership active · My account", "会員登録有効 · マイアカウント", "Abbonamento attivo · Account", "Membresía activa · Mi cuenta", "Abonnement actif · Mon compte"],
    ["会员码与次数", "Access codes and credits", "会員コードと利用回数", "Codici e utilizzi", "Códigos y usos", "Codes et utilisations"],
    ["会员码格式不正确，请检查后重试。", "Check the code format and try again.", "コードの形式を確認してください。", "Controlla il formato del codice e riprova.", "Revisa el formato del código e inténtalo de nuevo.", "Vérifiez le format du code et réessayez."],
    ["会员码不存在、已使用或已停用。", "The code is invalid, already redeemed, or disabled.", "コードが無効、使用済み、または停止されています。", "Il codice non è valido, è già usato o è disattivato.", "El código no es válido, ya se usó o está desactivado.", "Le code est invalide, déjà utilisé ou désactivé."],
    ["注册、登录与会员码", "Accounts and access codes", "登録・ログイン・会員コード", "Account e codici", "Cuentas y códigos", "Comptes et codes d’accès"],
    ["怎么兑换会员码？", "How do I redeem a code?", "会員コードの引き換え方法は？", "Come riscatto un codice?", "¿Cómo canjeo un código?", "Comment échanger un code ?"],
    ["登录后点击顶部账户入口，输入已获得的会员码并点击“兑换会员码”。兑换成功后，权益立即加入当前账号。", "Sign in, open your account at the top, enter your code, and choose Redeem. Access is added to the current account immediately.", "ログイン後、上部のアカウントからコードを入力し、引き換えを選びます。現在のアカウントにすぐ反映されます。", "Accedi, apri l’account in alto, inserisci il codice e scegli Riscatta. L’accesso viene aggiunto subito all’account attuale.", "Inicia sesión, abre tu cuenta arriba, introduce el código y pulsa Canjear. El acceso se añade de inmediato a la cuenta actual.", "Connectez-vous, ouvrez votre compte en haut, saisissez le code et cliquez sur Échanger. Les droits sont ajoutés immédiatement."],
    ["会员码由站外渠道交付，本站不收款、不展示支付二维码。每个码只能兑换一次，请确认登录的是你自己的账号。", "Codes are delivered through other platforms. This site collects no payments and displays no payment QR code. Each code can be redeemed once; check that you are in your own account.", "コードは外部で提供されます。当サイトは決済や決済QRを扱いません。1回限り有効ですので、自分のアカウントであることを確認してください。", "I codici sono consegnati altrove. Qui non si incassa né si mostrano QR di pagamento. Ogni codice vale una volta: verifica di usare il tuo account.", "Los códigos se entregan fuera del sitio. Aquí no se cobra ni se muestran QR de pago. Cada código se usa una vez; comprueba que sea tu cuenta.", "Les codes sont fournis ailleurs. Ce site n’encaisse aucun paiement et n’affiche pas de QR de paiement. Chaque code est à usage unique ; vérifiez votre compte."],
    ["会员码无效或兑换后权益没有变化？", "Code invalid or access unchanged?", "コードが無効、または反映されない場合は？", "Codice non valido o accesso invariato?", "¿Código inválido o acceso sin cambios?", "Code invalide ou droits inchangés ?"],
    ["检查会员码是否完整、是否已经兑换或被停用。刷新账户后仍有问题，请邮件提供登录邮箱、错误提示和会员码最后两组字符，请勿发送完整会员码。", "Check that the code is complete, unused, and enabled. If refreshing your account does not help, email your sign-in email, error, and the last two code groups. Never send the full code.", "コードが完全で未使用か確認してください。再読み込みしても解決しない場合は、ログイン用メール、エラー、末尾2組のみをメールしてください。コード全体は送らないでください。", "Verifica che il codice sia completo, inutilizzato e attivo. Se aggiornare non aiuta, invia email di accesso, errore e gli ultimi due gruppi del codice. Non inviare il codice completo.", "Comprueba que el código esté completo, sin usar y activo. Si actualizar no ayuda, envía tu correo, el error y los dos últimos grupos del código. No envíes el código completo.", "Vérifiez que le code est complet, inutilisé et actif. Si l’actualisation ne suffit pas, envoyez votre email, l’erreur et les deux derniers groupes du code. Jamais le code complet."],
    ["次数码每生成一个桌宠 ZIP 消耗 1 次，多个码可叠加。时长会员在有效期内不限生成次数，从兑换时开始计时；续期会接在原有效期后。导出配置不额外扣次。", "Credit codes add uses; each pet ZIP consumes one. Time-based membership allows unlimited generation until expiry, starting at redemption. Renewals extend the existing term. Config exports cost no extra use.", "回数コードはZIP生成で1回分使用し、追加できます。期間会員は引き換え時から期限まで無制限、更新で期限を延長します。設定の書き出しは回数を消費しません。", "I codici aggiungono utilizzi; ogni ZIP ne consuma uno. L’abbonamento consente generazioni illimitate fino alla scadenza e parte dal riscatto. I rinnovi estendono la durata. Esportare la configurazione non costa utilizzi.", "Los códigos añaden usos; cada ZIP consume uno. La membresía permite generaciones ilimitadas hasta caducar y empieza al canjear. Renovar amplía el plazo. Exportar la configuración no consume usos.", "Les codes ajoutent des crédits ; chaque ZIP en consomme un. L’abonnement permet des générations illimitées jusqu’à expiration à partir de l’échange. Le renouvellement prolonge la durée. L’export de configuration ne consomme rien."],
    ["先确认已上传图片、已登录，且会员有效或账号还有可用次数。生成完成后，浏览器会下载一个 ZIP 文件。", "Upload an image, sign in, and check for active membership or available credits. Your browser downloads a ZIP when generation finishes.", "画像、ログイン状態、有効な会員期間または残り回数を確認してください。生成後にZIPをダウンロードします。", "Carica un’immagine, accedi e verifica abbonamento o crediti. Il browser scarica uno ZIP al termine.", "Sube una imagen, inicia sesión y comprueba la membresía o los créditos. El navegador descarga un ZIP al terminar.", "Ajoutez une image, connectez-vous et vérifiez votre abonnement ou vos crédits. Le navigateur télécharge un ZIP à la fin."],
    ["依次检查图片、预览和登录状态，再确认会员有效或有剩余次数。没有使用权益时，请从账户入口兑换会员码。", "Check the image, preview, and sign-in status, then your membership or credits. Redeem a code from your account if you have no access.", "画像、プレビュー、ログイン、会員期限や回数を確認してください。利用権がない場合はアカウントでコードを引き換えてください。", "Controlla immagine, anteprima e accesso, poi abbonamento o crediti. Se mancano, riscatta un codice nell’account.", "Revisa imagen, vista previa y sesión, luego membresía o créditos. Si no tienes acceso, canjea un código en tu cuenta.", "Vérifiez l’image, l’aperçu et la connexion, puis l’abonnement ou les crédits. Échangez un code dans votre compte si nécessaire."],
    ["请写清楚所在页面、操作步骤、预期和实际结果，并附浏览器或 Windows 版本与截图。会员码问题只提供尾号。", "Include the page, steps, expected and actual result, browser or Windows version, and screenshot. For codes, provide only the ending.", "ページ、操作、期待した結果と実際の結果、環境と画像を記載してください。コードは末尾のみを記載してください。", "Indica pagina, passaggi, risultato atteso e reale, browser o Windows e screenshot. Per i codici invia solo la parte finale.", "Incluye página, pasos, resultado esperado y real, navegador o Windows y captura. Para códigos, solo el final.", "Indiquez la page, les étapes, le résultat attendu et obtenu, le navigateur ou Windows et une capture. Pour les codes, seulement la fin."],
    ["请勿发送密码、验证码、完整会员码、私人照片或其他敏感资料。", "Do not send passwords, verification codes, full access codes, private photos, or sensitive information.", "パスワード、確認コード、会員コード全体、個人写真などは送らないでください。", "Non inviare password, codici di verifica, codici completi, foto private o dati sensibili.", "No envíes contraseñas, códigos de verificación, códigos completos, fotos privadas ni datos sensibles.", "N’envoyez ni mot de passe, code de vérification, code complet, photo privée ni donnée sensible."],
    ["管理后台", "Admin dashboard", "管理ダッシュボード", "Pannello amministratore", "Panel de administración", "Tableau de bord admin"],
    ["问题反馈", "Report an issue", "問題を報告", "Segnala un problema", "Informar de un problema", "Signaler un problème"],
    ["管理员 · 无限使用", "Admin · Unlimited", "管理者 · 無制限", "Admin · Illimitato", "Admin · Ilimitado", "Admin · Illimité"],
    ["无限次可用", "Unlimited uses", "無制限に利用可能", "Utilizzi illimitati", "Usos ilimitados", "Utilisations illimitées"],
    ["管理员账号已恢复，可无限生成桌宠并查看运营后台。", "Admin access is active. Create unlimited pets and open the operations dashboard.", "管理者は無制限でペットを作成し、ダッシュボードを利用できます。", "Accesso admin attivo. Crea pet senza limiti e apri il pannello.", "Acceso admin activo. Crea mascotas sin límites y abre el panel.", "Accès admin actif. Créez des compagnons sans limite et ouvrez le tableau de bord."],
    ["告诉我们遇到什么问题", "Tell us what went wrong", "問題をお知らせください", "Raccontaci il problema", "Cuéntanos el problema", "Décrivez le problème"],
    ["提交后会进入管理员工作台。请勿填写密码或验证码。", "Your report goes to the admin dashboard. Do not include passwords or verification codes.", "送信内容は管理者に届きます。パスワードや確認コードは記入しないでください。", "La segnalazione arriva al pannello admin. Non includere password o codici.", "El informe llega al panel admin. No incluyas contraseñas ni códigos.", "Le signalement est envoyé au tableau de bord admin. N’incluez ni mot de passe ni code."],
    ["问题类型", "Issue type", "問題の種類", "Tipo di problema", "Tipo de problema", "Type de problème"],
    ["功能异常", "Feature problem", "機能の問題", "Problema di funzionalità", "Problema de funcionamiento", "Problème de fonctionnement"],
    ["账号登录", "Account sign-in", "アカウント・ログイン", "Accesso account", "Inicio de sesión", "Connexion au compte"],
    ["改进建议", "Suggestion", "改善提案", "Suggerimento", "Sugerencia", "Suggestion"],
    ["其他", "Other", "その他", "Altro", "Otro", "Autre"],
    ["问题描述", "Description", "問題の説明", "Descrizione", "Descripción", "Description"],
    ["复现步骤或补充信息", "Steps or additional details", "再現手順・補足", "Passaggi o altri dettagli", "Pasos u otros detalles", "Étapes ou précisions"],
    ["请描述你希望我们解决的问题", "Describe the problem you need help with", "解決したい問題を説明してください", "Descrivi il problema da risolvere", "Describe el problema que quieres resolver", "Décrivez le problème à résoudre"],
    ["可填写操作步骤、浏览器/系统版本或报错内容", "Include steps, browser/OS version, or the error message", "操作手順、ブラウザー・OS、エラー内容など", "Indica passaggi, browser/sistema o errore", "Incluye pasos, navegador/sistema o error", "Indiquez les étapes, le navigateur/système ou l’erreur"],
    ["提交反馈", "Submit report", "フィードバックを送信", "Invia segnalazione", "Enviar informe", "Envoyer le signalement"],
    ["正在提交反馈…", "Submitting report…", "送信中…", "Invio in corso…", "Enviando informe…", "Envoi en cours…"],
    ["反馈已提交，管理员会在后台查看。", "Report submitted. The admin can now review it.", "送信しました。管理者が確認します。", "Segnalazione inviata. L’admin la esaminerà.", "Informe enviado. El administrador lo revisará.", "Signalement envoyé. L’administrateur le consultera."],
    ["请先登录后提交问题反馈。", "Sign in before submitting a report.", "ログインしてから送信してください。", "Accedi prima di inviare una segnalazione.", "Inicia sesión antes de enviar un informe.", "Connectez-vous avant d’envoyer un signalement."],
    ["管理员无限次额度未扣减；桌宠 ZIP 已下载，解压全部文件后即可启动。", "Admin uses are unlimited. The pet ZIP is downloaded; extract all files to start.", "管理者は無制限です。ZIP の全ファイルを展開して起動してください。", "Utilizzi admin illimitati. ZIP scaricato; estrai tutti i file per avviare.", "Usos admin ilimitados. ZIP descargado; extrae todos los archivos para iniciar.", "Utilisations admin illimitées. ZIP téléchargé ; extrayez tous les fichiers pour démarrer."],
    ["返回 PET FORGE 首页", "Back to PET FORGE", "PET FORGE のトップへ戻る", "Torna alla home PET FORGE", "Volver a PET FORGE", "Retour à l’accueil PET FORGE"],
    ["PET FORGE 首页", "PET FORGE home", "PET FORGE ホーム", "Home PET FORGE", "Inicio de PET FORGE", "Accueil PET FORGE"],
    ["我的桌宠", "My pet", "マイペット", "Il mio pet", "Mi mascota", "Mon compagnon"],
    ["主导航", "Main navigation", "メインナビゲーション", "Navigazione principale", "Navegación principal", "Navigation principale"],
    ["制作桌宠", "Create a desktop pet", "デスクトップペットを作る", "Crea un pet desktop", "Crear una mascota de escritorio", "Créer un compagnon de bureau"],
    ["创作桌宠", "Create a pet", "ペットを作る", "Crea un pet", "Crear mascota", "Créer un compagnon"],
    ["进入创作台", "Open the studio", "スタジオを開く", "Apri lo studio", "Abrir el estudio", "Ouvrir l’atelier"],
    ["制作我的桌宠", "Make my desktop pet", "デスクトップペットを作る", "Crea il mio pet desktop", "Crear mi mascota de escritorio", "Créer mon compagnon de bureau"],
    ["让它跳一下", "Let it hop", "ジャンプさせる", "Fallo saltare", "Haz que salte", "Le faire sauter"],
    ["给日常，多一点小小的陪伴。", "A little companion for everyday life.", "毎日に、小さなぬくもりを。", "Un piccolo compagno per ogni giorno.", "Un poco de compañía para cada día.", "Un peu de compagnie au quotidien."],
    ["先和小猫，", "Say hello to the kitten,", "まずは子猫に、", "Prima saluta il gattino,", "Saluda al gatito,", "Dites bonjour au chaton,"],
    ["打个招呼。", "say hello.", "あいさつしよう。", "e digli ciao.", "y dile hola.", "et dites-lui bonjour."],
    ["鼠标慢慢移，它就慢慢跟。点击左键，跳一下。", "Move your mouse and it will follow. Click to make it hop.", "マウスを動かすと、ゆっくりついてきます。クリックでジャンプ。", "Muovi il mouse e ti seguirà. Fai clic per un saltello.", "Mueve el ratón y te seguirá. Haz clic para que salte.", "Déplacez la souris, il vous suit. Cliquez pour le faire sauter."],
    ["准备好了？做一只属于你的桌宠。", "Ready? Make a desktop pet of your own.", "準備はいい？自分だけのペットを作ろう。", "Pronto? Crea il tuo pet desktop.", "¿Listo? Crea tu propia mascota de escritorio.", "Prêt ? Créez votre compagnon de bureau."],
    ["从一张你喜欢的图片开始。", "Start with an image you love.", "お気に入りの画像から始めましょう。", "Inizia da un’immagine che ami.", "Empieza con una imagen que te guste.", "Commencez avec une image que vous aimez."],
    ["整个封面，都是它的小天地。", "The whole cover is its little playground.", "このカバー全体が、小さな遊び場です。", "Tutta la copertina è il suo piccolo mondo.", "Toda la portada es su pequeño mundo.", "Toute la couverture devient son petit monde."],
    ["移动鼠标让它跟来，点击左键让它跳一下。", "Move the mouse and it will follow; click to make it hop.", "マウスを動かすとついてきて、クリックでジャンプします。", "Muovi il mouse per farlo seguire; fai clic per un salto.", "Mueve el ratón para que te siga; haz clic para que salte.", "Déplacez la souris pour qu’il suive, cliquez pour le faire sauter."],
    ["等小猫准备好", "The kitten is getting ready", "子猫の準備中", "Il gattino si sta preparando", "El gatito se está preparando", "Le chaton se prépare"],
    ["小猫正在陪你", "The kitten is keeping you company", "子猫がそばにいます", "Il gattino ti tiene compagnia", "El gatito te acompaña", "Le chaton vous tient compagnie"],
    ["它在认真看着你", "It’s watching you closely", "じっと見つめています", "Ti osserva con attenzione", "Te está mirando", "Il vous regarde attentivement"],
    ["慢慢走到你身边", "Walking over to you", "ゆっくり近づいています", "Si avvicina piano", "Se acerca despacio", "Il s’approche doucement"],
    ["准备轻轻一跳", "Ready for a little hop", "ジャンプの準備中", "Pronto per un saltello", "Preparado para saltar", "Prêt pour un petit saut"],
    ["跳起来啦", "There it goes!", "ジャンプ！", "Eccolo che salta!", "¡Está saltando!", "Et hop !"],
    ["轻轻落地", "Landing softly", "そっと着地", "Atterra piano", "Aterriza suavemente", "Atterrissage en douceur"],
    ["小猫休息中", "The kitten is resting", "子猫は休憩中", "Il gattino riposa", "El gatito descansa", "Le chaton se repose"],
    ["至少 8 位", "At least 8 characters", "8 文字以上", "Almeno 8 caratteri", "Al menos 8 caracteres", "Au moins 8 caractères"],
    ["请输入手机号", "Enter your phone number", "電話番号を入力", "Inserisci il numero di telefono", "Introduce tu teléfono", "Saisissez votre numéro"],
    ["6 位验证码", "6-digit code", "6 桁の確認コード", "Codice a 6 cifre", "Código de 6 dígitos", "Code à 6 chiffres"],
    ["请再次输入密码", "Enter your password again", "パスワードをもう一度入力", "Inserisci di nuovo la password", "Repite la contraseña", "Saisissez à nouveau le mot de passe"],
    ["下载", "Download", "ダウンロード", "Scarica", "Descargar", "Télécharger"],
    ["排序", "Sort", "並べ替え", "Ordina", "Ordenar", "Trier"],
    ["查看我们的隐私政策", "Read our privacy policy", "プライバシーポリシーを見る", "Leggi l’informativa privacy", "Consulta la política de privacidad", "Lire la politique de confidentialité"],
    ["下载", "Download", "ダウンロード", "Scarica", "Descargar", "Télécharger"],
    ["暂停互动", "Pause interaction", "ふれあいを一時停止", "Metti in pausa", "Pausar interacción", "Mettre en pause"],
    ["继续互动", "Resume interaction", "ふれあいを再開", "Riprendi", "Reanudar interacción", "Reprendre"],
    ["让小猫回家", "Bring the kitten home", "子猫をおうちに戻す", "Riporta il gattino a casa", "Lleva al gatito a casa", "Ramener le chaton"],
    ["支持", "Support", "サポート", "Supporto", "Ayuda", "Assistance"],
    ["帮助与支持", "Help & support", "ヘルプとサポート", "Aiuto e supporto", "Ayuda y soporte", "Aide et assistance"],
    ["帮助中心", "Help center", "ヘルプセンター", "Centro assistenza", "Centro de ayuda", "Centre d’aide"],
    ["PET FORGE · 帮助中心", "PET FORGE · HELP CENTER", "PET FORGE · ヘルプセンター", "PET FORGE · CENTRO ASSISTENZA", "PET FORGE · CENTRO DE AYUDA", "PET FORGE · CENTRE D’AIDE"],
    ["遇到问题？", "Need a hand?", "お困りですか？", "Hai bisogno di aiuto?", "¿Necesitas ayuda?", "Besoin d’aide ?"],
    ["先从这里找答案。", "Start with these answers.", "まずはこちらをご確認ください。", "Inizia da queste risposte.", "Empieza por aquí.", "Commencez par ces réponses."],
    ["按主题浏览排查步骤。还没解决，可以直接发邮件，我会查看。", "Browse the steps by topic. If you still need help, email me and I’ll take a look.", "項目ごとの手順をご確認ください。解決しない場合はメールでご連絡ください。", "Segui i passaggi per argomento. Se non risolvi, scrivimi via email.", "Sigue los pasos por tema. Si no se resuelve, escríbeme por correo.", "Suivez les étapes par sujet. Si le problème persiste, écrivez-moi."],
    ["邮件反馈", "Email support", "メールで問い合わせ", "Scrivi all’assistenza", "Escribir a soporte", "Contacter l’assistance"],
    ["邮件联系", "Email support", "メールで問い合わせ", "Scrivi all’assistenza", "Escribir a soporte", "Contacter l’assistance"],
    ["反馈时请附上问题步骤、浏览器或 Windows 版本、页面提示截图。不要发送密码或验证码。", "Include the steps, browser or Windows version, and a screenshot. Never send your password or verification code.", "操作手順、ブラウザーまたは Windows のバージョン、画面のスクリーンショットを添えてください。パスワードや確認コードは送らないでください。", "Indica i passaggi, la versione del browser o di Windows e uno screenshot. Non inviare password o codici.", "Incluye los pasos, la versión del navegador o de Windows y una captura. No envíes contraseñas ni códigos.", "Indiquez les étapes, la version du navigateur ou de Windows et une capture. N’envoyez jamais votre mot de passe ni vos codes."],
    ["下载与 Windows 安全", "Downloads & Windows security", "ダウンロードと Windows のセキュリティ", "Download e sicurezza di Windows", "Descargas y seguridad de Windows", "Téléchargements et sécurité Windows"],
    ["点击“生成”后没有看到下载文件？", "Clicked Generate but no file appeared?", "「生成」を押してもファイルが見つからない場合", "Hai fatto clic su Genera ma non trovi il file?", "¿Pulsaste Generar y no aparece el archivo?", "Vous avez cliqué sur Générer sans voir de fichier ?"],
    ["打开 Edge 或 Chrome 的下载列表，检查是否被浏览器暂停；如提示允许多个文件下载，请允许本站下载。仍没有文件时，清除失败下载记录后刷新页面再试，并检查系统“下载”文件夹。", "Check the Edge or Chrome downloads list for a paused item. If asked to allow multiple downloads, allow them for this site. Otherwise clear the failed item, refresh, try again, and check your Downloads folder.", "Edge または Chrome のダウンロード一覧で一時停止中の項目を確認してください。複数ファイルのダウンロード許可が表示されたら、このサイトを許可します。失敗項目を消して更新し、PC の「ダウンロード」フォルダーも確認してください。", "Controlla l’elenco download di Edge o Chrome e autorizza più download per questo sito se richiesto. Rimuovi l’elemento non riuscito, aggiorna la pagina e controlla la cartella Download.", "Revisa las descargas de Edge o Chrome y permite varias descargas para este sitio si se solicita. Borra el intento fallido, actualiza la página y revisa la carpeta Descargas.", "Vérifiez la liste des téléchargements Edge ou Chrome et autorisez les téléchargements multiples pour ce site si demandé. Supprimez l’échec, actualisez la page et vérifiez le dossier Téléchargements."],
    ["下载的 ZIP 怎么打开？", "How do I open the ZIP?", "ZIP ファイルを開くには？", "Come apro il file ZIP?", "¿Cómo abro el ZIP?", "Comment ouvrir le ZIP ?"],
    ["在文件管理器中右键 ZIP，选择“全部解压”，再进入解压后的文件夹双击 `PetForge.exe`。不要在压缩包预览窗口里直接运行。", "In File Explorer, right-click the ZIP and choose Extract All. Open the extracted folder and double-click `PetForge.exe`. Don’t launch it from inside the archive preview.", "エクスプローラーで ZIP を右クリックし、「すべて展開」を選びます。展開先のフォルダーで `PetForge.exe` を起動してください。ZIP のプレビューから直接実行しないでください。", "In Esplora file, fai clic destro sullo ZIP e scegli Estrai tutto. Apri la cartella estratta e avvia `PetForge.exe`; non eseguirlo dall’anteprima dell’archivio.", "En el Explorador, haz clic derecho en el ZIP y elige Extraer todo. Abre la carpeta extraída y ejecuta `PetForge.exe`. No lo ejecutes desde la vista previa del archivo.", "Dans l’Explorateur, faites un clic droit sur le ZIP puis « Extraire tout ». Ouvrez le dossier extrait et lancez `PetForge.exe`. Ne le lancez pas depuis l’aperçu de l’archive."],
    ["请保留同一文件夹里的 `PetForge.exe`、`config.json` 和 `assets` 文件夹，不要只移动 EXE。这个版本是便携包，不是安装向导。", "Keep `PetForge.exe`, `config.json`, and the `assets` folder together. Don’t move the EXE by itself. This is a portable package, not an installer.", "`PetForge.exe`、`config.json`、`assets` フォルダーを同じ場所に保管してください。EXE だけを移動しないでください。これはインストーラーではなくポータブル版です。", "Tieni `PetForge.exe`, `config.json` e la cartella `assets` insieme. Non spostare solo l’EXE. È un pacchetto portatile, non un programma d’installazione.", "Mantén juntos `PetForge.exe`, `config.json` y la carpeta `assets`. No muevas solo el EXE. Es un paquete portátil, no un instalador.", "Gardez `PetForge.exe`, `config.json` et le dossier `assets` ensemble. Ne déplacez pas l’EXE seul. Il s’agit d’un paquet portable, pas d’un installateur."],
    ["Windows 显示“未知发布者”或 SmartScreen 提示怎么办？", "What if Windows shows “Unknown publisher” or a SmartScreen warning?", "「不明な発行元」または SmartScreen の警告が出たら？", "Cosa fare se Windows mostra “Autore sconosciuto” o un avviso SmartScreen?", "¿Qué hago si Windows muestra “Editor desconocido” o una alerta de SmartScreen?", "Que faire si Windows affiche « Éditeur inconnu » ou un avertissement SmartScreen ?"],
    ["目前公开桌宠包尚未使用受信任的代码签名证书，因此 Windows 可能提示无法验证发布者。这个提示本身不能证明文件有毒，也不能证明文件一定安全。", "The public desktop-pet package is not yet signed with a trusted code-signing certificate, so Windows may be unable to verify its publisher. This warning alone proves neither that the file is malware nor that it is safe.", "公開中のデスクトップペットは信頼されたコード署名証明書で署名されていないため、発行元を確認できない場合があります。この警告だけで、マルウェアとも安全とも断定できません。", "Il pacchetto pubblico non è ancora firmato con un certificato attendibile: Windows potrebbe non verificare l’autore. L’avviso da solo non dimostra né che il file sia dannoso né che sia sicuro.", "El paquete público aún no usa un certificado de firma de código de confianza, por lo que Windows puede no verificar al editor. Esta alerta por sí sola no demuestra que el archivo sea malicioso ni que sea seguro.", "Le paquet public n’est pas encore signé par un certificat de confiance ; Windows peut donc ne pas vérifier l’éditeur. Cet avertissement ne prouve à lui seul ni que le fichier est malveillant ni qu’il est sûr."],
    ["只从 PET FORGE 官方网站下载，并可先用 Microsoft Defender 扫描文件。若不确定来源或不放心，请取消运行；不要关闭 Defender、SmartScreen，也不要添加排除项来绕过提示。", "Download only from the official PET FORGE site and scan the file with Microsoft Defender first if you prefer. Cancel if you’re unsure. Don’t disable Defender or SmartScreen or add an exclusion to bypass the warning.", "PET FORGE 公式サイトからのみダウンロードし、必要なら Microsoft Defender でスキャンしてください。出所が不明、または不安な場合は実行を中止してください。Defender や SmartScreen を無効にしたり、除外設定を追加したりしないでください。", "Scarica solo dal sito ufficiale PET FORGE e, se vuoi, esegui prima una scansione con Microsoft Defender. Se non sei sicuro, annulla. Non disattivare Defender o SmartScreen e non aggiungere esclusioni.", "Descarga solo desde el sitio oficial de PET FORGE y, si lo prefieres, analiza el archivo con Microsoft Defender. Si tienes dudas, cancela. No desactives Defender ni SmartScreen ni añadas exclusiones.", "Téléchargez uniquement depuis le site officiel PET FORGE et analysez le fichier avec Microsoft Defender si besoin. En cas de doute, annulez. Ne désactivez pas Defender ou SmartScreen et n’ajoutez pas d’exclusion."],
    ["PetForge.exe 双击后没有窗口或马上退出？", "PetForge.exe opens no window or closes immediately?", "PetForge.exe を起動しても表示されない、すぐ終了する場合", "PetForge.exe non si apre o si chiude subito?", "¿PetForge.exe no abre o se cierra enseguida?", "PetForge.exe ne s’ouvre pas ou se ferme aussitôt ?"],
    ["确认 ZIP 已完整解压，并且 EXE、配置文件和 `assets` 仍在一起。把整个文件夹放在本机一个固定位置（例如“下载”或“桌面”），再启动一次；不要从压缩包、网盘预览或临时目录运行。", "Make sure the ZIP was fully extracted and the EXE, config, and `assets` are still together. Move the whole folder to a stable local location and try again; don’t run it from the ZIP, cloud preview, or a temporary folder.", "ZIP を完全に展開し、EXE・設定ファイル・`assets` がそろっていることを確認してください。フォルダー全体を PC 内の固定場所に移し、再度起動します。ZIP、クラウドのプレビュー、一時フォルダーから実行しないでください。", "Verifica che lo ZIP sia estratto completamente e che EXE, configurazione e `assets` siano insieme. Sposta l’intera cartella in una posizione locale stabile e riprova; non avviare dall’archivio, dall’anteprima cloud o da una cartella temporanea.", "Asegúrate de extraer todo el ZIP y mantener juntos el EXE, la configuración y `assets`. Mueve la carpeta completa a una ubicación local estable y vuelve a probar; no lo ejecutes desde el ZIP, una vista previa en la nube ni una carpeta temporal.", "Vérifiez que le ZIP est entièrement extrait et que l’EXE, la configuration et `assets` restent ensemble. Déplacez tout le dossier vers un emplacement local stable et réessayez ; ne le lancez pas depuis l’archive, un aperçu cloud ou un dossier temporaire."],
    ["如果仍退出，请邮件附上 Windows 版本、启动步骤和错误截图。不要把账号密码、邮箱验证码或个人文件发来。", "If it still closes, email your Windows version, launch steps, and a screenshot of the error. Never send your password, email code, or personal files.", "改善しない場合は、Windows のバージョン、起動手順、エラー画面をメールでお知らせください。パスワード、メール確認コード、個人ファイルは送らないでください。", "Se continua a chiudersi, invia via email la versione di Windows, i passaggi eseguiti e uno screenshot dell’errore. Non inviare password, codici email o file personali.", "Si sigue cerrándose, envía por correo tu versión de Windows, los pasos y una captura del error. Nunca envíes tu contraseña, código de correo ni archivos personales.", "S’il se ferme encore, envoyez votre version de Windows, les étapes suivies et une capture de l’erreur. N’envoyez jamais mot de passe, code email ou fichier personnel."],
    ["邮箱和手机号注册有什么区别？", "What’s the difference between email and phone sign-up?", "メール登録と電話番号登録の違いは？", "Che differenza c’è tra registrazione email e telefono?", "¿Qué diferencia hay entre registrarse con correo o teléfono?", "Quelle différence entre l’inscription par email et par téléphone ?"],
    ["在注册页先选择一种方式：邮箱注册使用邮箱验证码，手机号注册使用短信验证码；验证码必须和所选方式一致。注册时需要填写至少 8 位密码，并再次确认。", "Choose one method on the sign-up form: email sign-up uses an email code, and phone sign-up uses an SMS code. Use the matching code and enter a password of at least 8 characters twice.", "登録画面で方法を選びます。メール登録にはメール確認コード、電話番号登録には SMS コードを使います。選択した方法に合うコードを入力し、8 文字以上のパスワードを 2 回入力してください。", "Scegli un metodo nel modulo: la registrazione email usa un codice email, quella telefonica un codice SMS. Usa il codice corretto e inserisci due volte una password di almeno 8 caratteri.", "Elige un método en el formulario: el correo usa un código por email y el teléfono un SMS. Usa el código correspondiente e introduce dos veces una contraseña de al menos 8 caracteres.", "Choisissez une méthode : l’inscription par email utilise un code email, celle par téléphone un code SMS. Utilisez le code correspondant et saisissez deux fois un mot de passe d’au moins 8 caractères."],
    ["登录时也要选择注册时使用的同一身份方式。邮箱和手机号不要互相替代尝试。", "When signing in, select the same identity method you used to register. Email and phone are not interchangeable.", "ログイン時も登録時と同じ方法を選択してください。メールと電話番号は互換ではありません。", "Per accedere, seleziona lo stesso metodo usato alla registrazione. Email e telefono non sono intercambiabili.", "Al iniciar sesión, elige el mismo método usado al registrarte. El correo y el teléfono no son intercambiables.", "À la connexion, choisissez la même méthode qu’à l’inscription. Email et téléphone ne sont pas interchangeables."],
    ["验证码没有收到，应该怎么排查？", "Didn’t receive a verification code?", "確認コードが届かない場合は？", "Non hai ricevuto il codice di verifica?", "¿No recibiste el código de verificación?", "Vous n’avez pas reçu le code de vérification ?"],
    ["邮箱请检查地址拼写、垃圾邮件和广告邮件文件夹；手机请确认号码正确且可以接收短信。页面发送按钮会有短暂冷却，请等待后再试，避免连续点击。", "Check the email address and spam or promotions folders. For SMS, verify the number and that it can receive messages. The send button has a cooldown; wait before trying again.", "メールアドレスの綴りと迷惑メール・広告フォルダーを確認してください。SMS は番号と受信設定を確認します。送信ボタンには待ち時間があるため、連続で押さずにお待ちください。", "Controlla l’indirizzo e le cartelle spam/promozioni. Per gli SMS, verifica il numero e la ricezione. Il pulsante di invio ha un intervallo di attesa: aspetta prima di riprovare.", "Comprueba la dirección y las carpetas de spam o promociones. Para SMS, revisa el número y la recepción. El botón tiene un tiempo de espera; aguarda antes de intentarlo de nuevo.", "Vérifiez l’adresse et les dossiers spam ou promotions. Pour les SMS, vérifiez le numéro et la réception. Le bouton d’envoi impose un délai ; attendez avant de réessayer."],
    ["如果页面明确提示账号服务未配置或暂时无法连接，稍后再试仍不行，请邮件反馈发生时间和提示截图；不要在邮件里提供验证码或密码。", "If the page says the account service is not configured or unreachable, try again later. If it persists, email the time and a screenshot. Don’t include your code or password.", "アカウントサービス未設定または接続不可と表示された場合は、時間をおいて再試行してください。続く場合は発生時刻と画面をメールでお知らせください。コードやパスワードは書かないでください。", "Se il servizio account risulta non configurato o non raggiungibile, riprova più tardi. Se persiste, invia via email l’ora e uno screenshot. Non includere codici o password.", "Si el servicio de cuentas no está configurado o no conecta, inténtalo más tarde. Si persiste, envía por correo la hora y una captura. No incluyas códigos ni contraseñas.", "Si le service de compte est indisponible ou non configuré, réessayez plus tard. Si le problème persiste, indiquez l’heure et joignez une capture par email. N’incluez ni code ni mot de passe."],
    ["注册时提示密码不一致或密码无效？", "Password mismatch or invalid password?", "パスワードが一致しない、または無効と表示される場合", "Password diverse o non valida?", "¿Contraseña no válida o diferente?", "Mot de passe invalide ou différent ?"],
    ["密码至少 8 位；注册表单中的“密码”和“再次确认密码”必须完全一致。注意检查输入法、前后空格和大小写，再重新输入两遍。", "Passwords must be at least 8 characters, and both fields must match exactly. Check capitalization, input method, and accidental spaces, then enter it again.", "パスワードは 8 文字以上で、2 つの欄が完全に一致する必要があります。大文字小文字、入力モード、前後の空白を確認して再入力してください。", "La password deve avere almeno 8 caratteri e i due campi devono coincidere. Controlla maiuscole, metodo di input e spazi, poi riprova.", "La contraseña debe tener al menos 8 caracteres y ambos campos deben coincidir. Revisa mayúsculas, método de entrada y espacios, y vuelve a escribirla.", "Le mot de passe doit contenir au moins 8 caractères et les deux champs doivent correspondre. Vérifiez la casse, la saisie et les espaces, puis recommencez."],
    ["每个操作都会扣一次吗？", "Does every action use a credit?", "すべての操作で利用回数が減りますか？", "Ogni azione consuma un utilizzo?", "¿Cada acción consume un uso?", "Chaque action consomme-t-elle une utilisation ?"],
    ["图片与桌宠制作", "Images & pet creation", "画像とペットの作成", "Immagini e creazione del pet", "Imágenes y creación de mascotas", "Images et création du compagnon"],
    ["支持什么图片？图片太大或预览失败怎么办？", "Which image formats work? What if preview fails?", "対応画像形式は？大きすぎる画像やプレビュー失敗は？", "Quali immagini sono supportate? E se l’anteprima non funziona?", "¿Qué formatos admite? ¿Y si falla la vista previa?", "Quels formats d’image sont pris en charge ? Que faire si l’aperçu échoue ?"],
    ["支持 PNG、JPG/JPEG 和 WEBP。透明背景的 PNG 通常更适合桌宠。大图片会占用较多浏览器内存；如果预览卡住，可以先把图片缩小或压缩，再用新版 Edge 或 Chrome 重试。", "PNG, JPG/JPEG, and WEBP are supported. Transparent PNGs usually work best. Large images use more browser memory; resize or compress them, then retry in an updated Edge or Chrome.", "PNG、JPG/JPEG、WEBP に対応しています。透明 PNG が適しています。大きな画像はブラウザーのメモリーを多く使うため、縮小・圧縮して最新版 Edge または Chrome で再試行してください。", "Sono supportati PNG, JPG/JPEG e WEBP. Le PNG trasparenti sono spesso ideali. Le immagini grandi usano più memoria: riducile o comprimile e riprova con Edge o Chrome aggiornato.", "Se admiten PNG, JPG/JPEG y WEBP. Los PNG transparentes suelen ser ideales. Las imágenes grandes usan más memoria: redúcelas o comprímelas y vuelve a probar en Edge o Chrome actualizado.", "PNG, JPG/JPEG et WEBP sont pris en charge. Les PNG transparents sont souvent idéaux. Les grandes images consomment plus de mémoire : réduisez-les ou compressez-les, puis réessayez avec Edge ou Chrome à jour."],
    ["桌宠创作页的预览和生成在当前浏览器中处理图片；只有你主动发布到创意工坊时，图片和作品资料才会上传并公开展示。", "The creator preview and package generation process images in your browser. Images and details are uploaded and made public only if you choose to publish to the Workshop.", "作成ページのプレビューと生成はブラウザー内で画像を処理します。画像と作品情報がアップロードされ公開されるのは、創意工房への投稿を選んだ場合のみです。", "L’anteprima e la generazione elaborano le immagini nel browser. Immagini e dettagli vengono caricati e resi pubblici solo se scegli di pubblicare nel Workshop.", "La vista previa y la generación procesan las imágenes en tu navegador. Solo se suben y publican si decides compartirlas en el Taller.", "L’aperçu et la génération traitent les images dans le navigateur. Elles ne sont téléversées et rendues publiques que si vous choisissez de publier dans l’atelier."],
    ["“生成”按钮不可用或提示没有次数？", "Generate is disabled or says no uses are available?", "生成ボタンが無効、または利用回数がないと表示される場合", "Genera è disattivato o non hai utilizzi?", "¿Generar está desactivado o no tienes usos?", "Générer est désactivé ou aucun crédit n’est disponible ?"],
    ["如果登录状态反复消失，刷新页面重新登录；如提示账号服务无法连接，先确认网络，再稍后重试。", "If you keep getting signed out, refresh and sign in again. If the account service is unreachable, check your connection and try again later.", "ログイン状態が消える場合はページを更新して再ログインしてください。アカウントサービスに接続できない場合は、ネットワークを確認して時間をおいて再試行します。", "Se la sessione scompare, aggiorna la pagina e accedi di nuovo. Se il servizio account non è raggiungibile, controlla la connessione e riprova più tardi.", "Si se cierra la sesión, actualiza y vuelve a entrar. Si no se puede conectar al servicio, revisa la conexión e inténtalo más tarde.", "Si la session disparaît, actualisez et reconnectez-vous. Si le service est inaccessible, vérifiez la connexion et réessayez plus tard."],
    ["生成提示桌宠运行核心下载失败？", "Package generation says the pet runtime failed to download?", "生成時に実行ファイルのダウンロードに失敗する場合", "La generazione segnala un errore nel download del runtime?", "¿Falló la descarga del núcleo al generar?", "Le téléchargement du moteur a échoué pendant la génération ?"],
    ["生成 ZIP 时，网页还需要从本站读取桌宠运行文件。刷新到最新版后重试，并确认网络没有拦截本站文件下载。", "To build the ZIP, the page also fetches the pet runtime from this site. Refresh to the latest version and retry; check that your connection is not blocking site downloads.", "ZIP 作成時に、サイトから実行ファイルも読み込みます。最新版に更新して再試行し、ネットワークがサイトのファイルをブロックしていないか確認してください。", "Per creare lo ZIP, la pagina scarica anche il runtime da questo sito. Aggiorna alla versione più recente e riprova; verifica che la rete non blocchi i download.", "Para crear el ZIP, la página también descarga el núcleo desde este sitio. Actualiza a la última versión y comprueba que la red no bloquee la descarga.", "Pour créer le ZIP, la page récupère aussi le moteur depuis ce site. Actualisez vers la dernière version et vérifiez que le réseau ne bloque pas le téléchargement."],
    ["如果仍显示 HTTP 错误或“文件不完整”，请邮件提供错误提示、浏览器版本和发生时间；不要反复生成消耗次数，先联系支持确认。", "If an HTTP error or incomplete-file message persists, email the exact message, browser version, and time. Don’t repeatedly generate and use credits; contact support first.", "HTTP エラーや「ファイルが不完全」の表示が続く場合は、エラー全文、ブラウザーのバージョン、発生時刻をメールしてください。回数を消費する再生成を繰り返す前にご連絡ください。", "Se persistono errori HTTP o file incompleti, invia il messaggio, la versione del browser e l’ora. Non consumare altri utilizzi ripetendo la generazione: contatta prima l’assistenza.", "Si persiste el error HTTP o el archivo incompleto, envía el mensaje, navegador y hora. No gastes más usos repitiendo; contacta primero con soporte.", "Si l’erreur HTTP ou le fichier incomplet persiste, envoyez le message, la version du navigateur et l’heure. N’utilisez pas d’autres crédits en répétant ; contactez d’abord l’assistance."],
    ["设置怎么保存？刷新后还会保留吗？", "How do I save settings? Will they survive a refresh?", "設定を保存するには？更新後も残りますか？", "Come salvo le impostazioni? Restano dopo l’aggiornamento?", "¿Cómo guardo la configuración? ¿Se conserva al actualizar?", "Comment enregistrer les réglages ? Seront-ils conservés après actualisation ?"],
    ["创作台不会自动备份未导出的编辑状态。完成设置后，使用“导出制作配置”保存 JSON 文件；生成包也包含当时的配置。刷新页面前先保存需要留存的内容。", "The studio does not automatically back up unsaved edits. Use Export Configuration to save a JSON file; each generated package also includes its settings. Export anything you want to keep before refreshing.", "未エクスポートの編集内容は自動保存されません。「設定を書き出す」で JSON を保存してください。生成パッケージにもその時点の設定が含まれます。更新前に必要な内容を保存します。", "Le modifiche non esportate non vengono salvate automaticamente. Usa Esporta configurazione per salvare un JSON; ogni pacchetto generato include le impostazioni correnti. Esporta prima di aggiornare.", "Los cambios no exportados no se guardan automáticamente. Usa Exportar configuración para guardar un JSON; cada paquete incluye los ajustes actuales. Exporta antes de actualizar.", "Les modifications non exportées ne sont pas sauvegardées automatiquement. Utilisez Exporter la configuration pour enregistrer un JSON ; chaque paquet inclut les réglages. Exportez avant d’actualiser."],
    ["快捷入口没有打开目标软件？", "A shortcut did not open the target app?", "ショートカットからアプリが開かない場合", "Il collegamento non apre l’app prevista?", "¿El acceso directo no abre la aplicación?", "Le raccourci n’ouvre pas l’application ?"],
    ["网址类型适合网站；软件类型需要目标电脑已安装对应程序；文件或文件夹路径必须在那台电脑上存在。检查路径、应用协议和安装位置，再重新生成桌宠包。", "Use URL for websites. App shortcuts require the app to be installed on that computer; file and folder paths must exist there. Check the path, app protocol, and install location, then rebuild the pet package.", "Web サイトには URL を使います。アプリのショートカットは対象 PC にアプリが必要です。ファイルやフォルダーのパスもその PC に存在する必要があります。確認後にパッケージを再生成してください。", "Usa URL per i siti. Le scorciatoie per app richiedono che l’app sia installata su quel PC; i percorsi devono esistere lì. Controlla percorso, protocollo e installazione, poi rigenera il pacchetto.", "Usa URL para sitios web. Las aplicaciones deben estar instaladas en ese equipo y las rutas deben existir allí. Revisa ruta, protocolo e instalación y vuelve a generar el paquete.", "Utilisez URL pour les sites. L’application doit être installée sur le PC concerné et les chemins doivent y exister. Vérifiez chemin, protocole et emplacement, puis recréez le paquet."],
    ["你电脑上的本地路径不会自动适用于其他用户的电脑；分享桌宠时请优先使用网址，或说明对方需要自行调整的路径。", "Local paths from your computer won’t work automatically on someone else’s PC. Prefer website links when sharing, or tell others which path they must update.", "自分の PC のローカルパスは他の人の PC では自動的に使えません。共有時は URL を使うか、相手が変更すべきパスを説明してください。", "I percorsi locali del tuo PC non funzionano automaticamente su altri computer. Per condividere, preferisci URL o indica quale percorso modificare.", "Las rutas locales de tu PC no funcionan automáticamente en otros equipos. Al compartir, usa URL o indica qué ruta deben cambiar.", "Les chemins locaux de votre PC ne fonctionneront pas sur celui d’un autre. Préférez les URL ou indiquez le chemin à modifier."],
    ["网站、隐私与其他问题", "Website, privacy & more", "サイト・プライバシー・その他", "Sito, privacy e altro", "Sitio, privacidad y más", "Site, confidentialité et autres questions"],
    ["我上传的图片会被网站保存吗？", "Does the site store my image?", "アップロードした画像は保存されますか？", "Il sito conserva le mie immagini?", "¿El sitio guarda mis imágenes?", "Le site conserve-t-il mes images ?"],
    ["制作页的预览和桌宠包生成在浏览器本地处理图片。若你主动把作品发布到创意工坊，作品图片、标题、说明和配置会上传以供公开浏览；请勿发布含私人信息或未经授权的图片。", "The creator preview and package generation process images locally in your browser. If you publish to the Workshop, the image, title, description, and config are uploaded for public viewing. Don’t post private or unauthorized images.", "制作ページのプレビューとパッケージ生成はブラウザー内で画像を処理します。Workshop に投稿すると、画像、タイトル、説明、設定が公開用にアップロードされます。個人情報を含む画像や許可のない画像は投稿しないでください。", "L’anteprima e la generazione elaborano le immagini nel browser. Se pubblichi nel Workshop, immagine, titolo, descrizione e configurazione vengono caricati e resi pubblici. Non pubblicare immagini private o senza autorizzazione.", "La vista previa y la generación procesan las imágenes localmente. Si publicas en el Taller, la imagen, el título, la descripción y la configuración se suben para mostrarse públicamente. No compartas imágenes privadas o sin permiso.", "L’aperçu et la génération traitent les images localement. En cas de publication dans l’atelier, image, titre, description et configuration sont téléversés publiquement. Ne publiez pas d’images privées ou non autorisées."],
    ["封面语言切换后会保存吗？", "Will my language choice be remembered?", "言語の選択は保存されますか？", "La lingua scelta verrà ricordata?", "¿Se recordará el idioma elegido?", "Le choix de langue sera-t-il mémorisé ?"],
    ["语言选择会保存在当前浏览器，下次打开本站会继续使用。切换只改变网站界面文字，不会翻译你自己输入的桌宠名称、台词或上传图片。", "Your language choice is saved in this browser and reused next time. It changes the interface only; it won’t translate your pet’s name, dialogue, or uploaded image.", "言語設定はこのブラウザーに保存され、次回も使われます。変更されるのは画面表示のみで、ペット名やセリフ、アップロード画像は翻訳されません。", "La lingua viene salvata in questo browser. Cambia solo l’interfaccia, non il nome o le frasi del pet né le immagini caricate.", "El idioma se guarda en este navegador. Solo cambia la interfaz; no traduce el nombre, los diálogos ni las imágenes que subas.", "La langue est enregistrée dans ce navigateur. Seule l’interface change ; le nom, les répliques et les images du compagnon ne sont pas traduits."],
    ["提交问题时，邮件里最好写什么？", "What should I include in a support email?", "問い合わせメールには何を書けばよいですか？", "Cosa includere in un’email all’assistenza?", "¿Qué debo incluir en un correo a soporte?", "Que faut-il inclure dans un email d’assistance ?"],
    ["还需要帮助？", "Still need help?", "まだお困りですか？", "Hai ancora bisogno di aiuto?", "¿Aún necesitas ayuda?", "Encore besoin d’aide ?"],
    ["把问题步骤发给我。", "Send me the steps you took.", "試した手順をお知らせください。", "Inviami i passaggi che hai seguito.", "Envíame los pasos que seguiste.", "Envoyez-moi les étapes suivies."],
    ["附上错误提示和截图，我会按你遇到的页面继续排查。", "Include the error message and a screenshot so I can investigate the exact page with you.", "エラー表示とスクリーンショットを添えてください。該当ページに沿って確認します。", "Allega il messaggio e uno screenshot, così posso verificare la pagina specifica.", "Adjunta el mensaje de error y una captura para revisar esa página contigo.", "Joignez le message d’erreur et une capture pour que je vérifie la page concernée."],
    ["给你的桌面，一点陪伴。", "A little company for your desktop.", "デスクトップに、小さなぬくもりを。", "Un po’ di compagnia sul desktop.", "Un poco de compañía en tu escritorio.", "Un peu de compagnie sur votre bureau."],
    ["产品", "Product", "製品", "Prodotto", "Producto", "Produit"],
    ["支持", "Support", "サポート", "Supporto", "Ayuda", "Assistance"],
    ["账号", "Account", "アカウント", "Account", "Cuenta", "Compte"],
    ["登录与使用", "Sign-in & usage", "ログインと利用", "Accesso e utilizzo", "Acceso y uso", "Connexion et utilisation"],
    ["创作台", "Studio", "スタジオ", "Studio", "Estudio", "Atelier"],
    ["桌宠功能", "Pet features", "ペットの機能", "Funzioni del pet", "Funciones de la mascota", "Fonctions du compagnon"],
    ["使用指南", "How it works", "使い方", "Come funziona", "Cómo funciona", "Mode d’emploi"],
    ["创意工坊", "Workshop", "クリエイター工房", "Workshop", "Taller", "Atelier communautaire"],
    ["桌宠创作台", "Desktop pet studio", "デスクトップペット制作", "Studio pet desktop", "Estudio de mascotas", "Atelier de compagnon"],
    ["本地处理 · 你的图片不会离开当前浏览器", "Processed locally · your image stays in this browser", "ローカル処理 · 画像はこのブラウザー内にとどまります", "Elaborazione locale · l’immagine resta nel browser", "Procesamiento local · tu imagen no sale del navegador", "Traitement local · votre image reste dans ce navigateur"],
    ["角色与状态", "Character & state", "キャラクターと状態", "Personaggio e stato", "Personaje y estado", "Personnage et état"],
    ["上传你的桌宠图片", "Upload your pet image", "ペットの画像をアップロード", "Carica l’immagine del pet", "Sube la imagen de tu mascota", "Importer l’image du compagnon"],
    ["PNG、JPG 或 WEBP，推荐透明 PNG", "PNG, JPG, or WEBP; transparent PNG recommended", "PNG、JPG、WEBP（透過 PNG 推奨）", "PNG, JPG o WEBP; consigliato PNG trasparente", "PNG, JPG o WEBP; recomendado PNG transparente", "PNG, JPG ou WEBP ; PNG transparent recommandé"],
    ["原始", "Original", "オリジナル", "Originale", "Original", "Original"],
    ["像素格", "Pixel", "ピクセル", "Pixel", "Píxel", "Pixel"],
    ["动画童话", "Toon story", "アニメ風", "Fiaba animata", "Cuento animado", "Conte animé"],
    ["漫画墨线", "Comic ink", "コミック", "Fumetto", "Tinta de cómic", "Encre BD"],
    ["Y2K 镜面", "Y2K chrome", "Y2K クローム", "Cromo Y2K", "Cromo Y2K", "Chrome Y2K"],
    ["霓虹梦境", "Neon dream", "ネオンの夢", "Sogno al neon", "Sueño neón", "Rêve néon"],
    ["桌宠名称", "Pet name", "ペットの名前", "Nome del pet", "Nombre de la mascota", "Nom du compagnon"],
    ["点击时说的话", "Greeting on click", "クリック時のセリフ", "Frase al clic", "Frase al hacer clic", "Phrase au clic"],
    ["你好，我在这里。", "Hi, I’m here.", "こんにちは、ここにいるよ。", "Ciao, sono qui.", "Hola, estoy aquí.", "Bonjour, je suis là."],
    ["显示大小", "Size", "Dimensione", "Dimensione", "Tamaño", "Taille"],
    ["透明度", "Opacity", "不透明度", "Opacità", "Opacidad", "Opacité"],
    ["初始状态", "Starting state", "初期状態", "Stato iniziale", "Estado inicial", "État initial"],
    ["陪伴中", "Keeping company", "そばにいる", "In compagnia", "Acompañando", "Présent"],
    ["工作中", "Working", "作業中", "Al lavoro", "Trabajando", "En activité"],
    ["休息中", "Resting", "休憩中", "A riposo", "Descansando", "Au repos"],
    ["睡眠中", "Sleeping", "睡眠中", "Addormentato", "Durmiendo", "Endormi"],
    ["点击动画", "Click animation", "クリック時の動き", "Animazione al clic", "Animación al clic", "Animation au clic"],
    ["轻跳", "Hop", "ぴょん", "Saltello", "Saltito", "Petit saut"],
    ["摇摆", "Sway", "ゆらゆら", "Dondolio", "Balanceo", "Balancement"],
    ["扭一扭", "Wiggle", "くねくね", "Oscilla", "Contoneo", "Se tortiller"],
    ["向前小跑", "Dash forward", "前に駆ける", "Scatto in avanti", "Correr hacia delante", "Filer en avant"],
    ["光环", "Halo", "光輪", "Alone", "Halo", "Halo"],
    ["无动画", "None", "なし", "Nessuna", "Ninguna", "Aucune"],
    ["气泡外观", "Bubble style", "吹き出しのスタイル", "Stile del fumetto", "Estilo del globo", "Style de bulle"],
    ["柔光白", "Soft white", "やわらかな白", "Bianco morbido", "Blanco suave", "Blanc doux"],
    ["玻璃感", "Glass", "ガラス風", "Vetro", "Cristal", "Verre"],
    ["深色", "Dark", "ダーク", "Scuro", "Oscuro", "Sombre"],
    ["初始位置", "Starting position", "初期位置", "Posizione iniziale", "Posición inicial", "Position initiale"],
    ["右下角", "Bottom right", "右下", "In basso a destra", "Abajo a la derecha", "En bas à droite"],
    ["左下角", "Bottom left", "左下", "In basso a sinistra", "Abajo a la izquierda", "En bas à gauche"],
    ["屏幕中央", "Center", "画面中央", "Centro", "Centro", "Au centre"],
    ["把你的图片放进这里", "Drop your image here", "画像をここに入れてください", "Inserisci qui la tua immagine", "Coloca aquí tu imagen", "Déposez votre image ici"],
    ["上传后即可预览大小、透明度与气泡", "Preview size, opacity, and bubbles after upload", "アップロード後にサイズや透明度を確認できます", "Dopo il caricamento puoi vedere dimensioni, opacità e fumetto", "Tras subirla podrás ver tamaño, opacidad y globo", "Après l’import, prévisualisez taille, opacité et bulle"],
    ["上传后可以继续在左侧调整外观。生成后的桌宠支持拖动、点击和右键菜单。", "After uploading, adjust the look on the left. The generated pet supports dragging, clicking, and a right-click menu.", "アップロード後、左側で外観を調整できます。生成したペットはドラッグ、クリック、右クリックメニューに対応します。", "Dopo il caricamento regola l’aspetto a sinistra. Il pet supporta trascinamento, clic e menu contestuale.", "Después de subirla, ajusta el aspecto a la izquierda. La mascota admite arrastre, clic y menú contextual.", "Après l’import, réglez l’apparence à gauche. Le compagnon prend en charge glisser, clic et menu contextuel."],
    ["功能与出口", "Behavior & shortcuts", "動きとショートカット", "Comportamento e collegamenti", "Comportamiento y accesos", "Comportement et raccourcis"],
    ["桌宠显示", "Pet display", "ペットの表示", "Visualizzazione del pet", "Visualización", "Affichage du compagnon"],
    ["始终置顶", "Always on top", "常に最前面", "Sempre in primo piano", "Siempre visible", "Toujours au premier plan"],
    ["仅在桌面显示", "Show only on desktop", "デスクトップ上のみ表示", "Mostra solo sul desktop", "Mostrar solo en el escritorio", "Afficher uniquement sur le bureau"],
    ["桌面阴影", "Desktop shadow", "デスクトップの影", "Ombra sul desktop", "Sombra del escritorio", "Ombre sur le bureau"],
    ["快捷入口", "Shortcuts", "ショートカット", "Collegamenti", "Accesos directos", "Raccourcis"],
    ["添加快捷入口", "Add shortcut", "ショートカットを追加", "Aggiungi collegamento", "Añadir acceso directo", "Ajouter un raccourci"],
    ["尚未添加快捷入口", "No shortcuts added yet", "ショートカットはまだありません", "Nessun collegamento aggiunto", "Aún no hay accesos directos", "Aucun raccourci pour le moment"],
    ["生成 Windows 桌宠 ZIP", "Generate Windows pet ZIP", "Windows ペット ZIP を生成", "Genera ZIP del pet Windows", "Generar ZIP para Windows", "Générer le ZIP Windows"],
    ["导出制作配置", "Export configuration", "設定を書き出す", "Esporta configurazione", "Exportar configuración", "Exporter la configuration"],
    ["请先上传你的桌宠图片，再生成 Windows 桌宠 ZIP。公开免警告安装版正在准备 Microsoft Store。", "Upload a pet image before generating a Windows ZIP. A signed public installer is being prepared for the Microsoft Store.", "画像をアップロードしてから Windows ZIP を生成してください。署名済み公開版は Microsoft Store 向けに準備中です。", "Carica un’immagine prima di generare lo ZIP Windows. Una versione pubblica firmata è in preparazione per Microsoft Store.", "Sube una imagen antes de generar el ZIP para Windows. Se prepara una versión pública firmada para Microsoft Store.", "Importez une image avant de générer le ZIP Windows. Une version publique signée est en préparation pour le Microsoft Store."],
    ["封面", "Cover", "カバー", "Copertina", "Portada", "Couverture"],
    ["塑造", "Create", "カスタマイズ", "Crea", "Crear", "Créer"],
    ["连接", "Connect", "つなぐ", "Collega", "Conectar", "Connecter"],
    ["交付", "Deliver", "お届け", "Consegna", "Entregar", "Livrer"],
    ["让它不只存在。", "More than a pretty face.", "そこにいるだけじゃない。", "Non solo presenza.", "No solo está ahí.", "Plus qu’une présence."],
    ["还能够替你行动。", "It can help you act.", "あなたの代わりに動いてくれる。", "Può anche agire per te.", "También puede ayudarte a actuar.", "Il peut aussi agir pour vous."],
    ["从你的图片开始", "Start with your image", "あなたの画像から", "Parti dalla tua immagine", "Empieza con tu imagen", "Commencez avec votre image"],
    ["不展示模板角色。上传后，预览和生成包只使用你的素材。", "No template characters. Your preview and package use your own image.", "テンプレートのキャラクターは使いません。プレビューとパッケージには自分の素材を使用します。", "Nessun personaggio predefinito: anteprima e pacchetto usano i tuoi contenuti.", "Sin personajes de plantilla. La vista previa y el paquete usan tu imagen.", "Pas de personnage modèle : aperçu et paquet utilisent votre image."],
    ["让互动变得有用", "Make interaction useful", "ふれあいを便利に", "Rendi utile l’interazione", "Haz útil la interacción", "Rendre l’interaction utile"],
    ["把浏览器、游戏、工具或文件夹变成桌宠右键菜单里的快捷入口。", "Add a browser, game, tool, or folder to your pet’s right-click menu.", "ブラウザー、ゲーム、ツール、フォルダーを右クリックメニューに追加できます。", "Aggiungi browser, giochi, strumenti o cartelle al menu del pet.", "Añade navegador, juego, herramienta o carpeta al menú de clic derecho.", "Ajoutez navigateur, jeu, outil ou dossier au menu contextuel."],
    ["为 Windows 桌面准备", "Made for the Windows desktop", "Windows デスクトップ向け", "Pensato per il desktop Windows", "Diseñado para el escritorio Windows", "Conçu pour le bureau Windows"],
    ["导出桌宠项目包，在电脑桌面上拖动、点击和使用你的自定义功能。", "Export a pet package to drag, click, and use your custom features on Windows.", "ペットのパッケージを書き出し、Windows 上で動かしたりクリックしたりできます。", "Esporta il pacchetto per trascinare e usare le funzioni personalizzate sul desktop Windows.", "Exporta el paquete para moverlo y usar sus funciones personalizadas en Windows.", "Exportez le compagnon pour le déplacer et utiliser vos fonctions sur Windows."],
    ["从一张图，", "From one image,", "一枚の画像から、", "Da un’immagine,", "De una imagen,", "D’une image,"],
    ["到桌面上的陪伴。", "to a companion on your desktop.", "デスクトップの相棒へ。", "a un compagno sul desktop.", "a una compañía en tu escritorio.", "à un compagnon sur votre bureau."],
    ["上传", "Upload", "アップロード", "Carica", "Subir", "Importer"],
    ["选择你希望它成为的样子。", "Choose how you want it to look.", "どんな姿にするか選びます。", "Scegli come vuoi che appaia.", "Elige cómo quieres que se vea.", "Choisissez son apparence."],
    ["调试", "Customize", "カスタマイズ", "Personalizza", "Personalizar", "Personnaliser"],
    ["设定语气、动画、外观与快捷功能。", "Set its voice, animation, look, and shortcuts.", "セリフ、動き、外観、ショートカットを設定します。", "Imposta voce, animazione, aspetto e collegamenti.", "Configura voz, animación, aspecto y accesos directos.", "Réglez la voix, l’animation, l’apparence et les raccourcis."],
    ["下载你的 Windows 桌宠项目包。", "Download your Windows pet package.", "Windows ペットのパッケージをダウンロードします。", "Scarica il pacchetto per Windows.", "Descarga el paquete para Windows.", "Téléchargez le paquet Windows."],
    ["登录后，", "Sign in to", "ログインして、", "Accedi per", "Inicia sesión para", "Connectez-vous pour"],
    ["登录", "Sign in", "ログイン", "Accedi", "Iniciar sesión", "Connexion"],
    ["注册", "Sign up", "新規登録", "Registrati", "Registrarse", "Inscription"],
    ["邮箱", "Email", "メール", "Email", "Correo", "Email"],
    ["手机号", "Phone", "電話番号", "Telefono", "Teléfono", "Téléphone"],
    ["邮箱验证码", "Email code", "メール確認コード", "Codice email", "Código por correo", "Code email"],
    ["短信验证码", "SMS code", "SMS 確認コード", "Codice SMS", "Código SMS", "Code SMS"],
    ["再次确认密码", "Confirm password", "パスワードを再入力", "Conferma password", "Confirmar contraseña", "Confirmer le mot de passe"],
    ["退出当前账号", "Sign out of this account", "現在のアカウントからログアウト", "Esci da questo account", "Cerrar esta sesión", "Se déconnecter de ce compte"],
    ["创建账号", "Create account", "アカウントを作成", "Crea account", "Crear cuenta", "Créer un compte"],
    ["密码", "Password", "パスワード", "Password", "Contraseña", "Mot de passe"],
    ["发送验证码", "Send code", "コードを送信", "Invia codice", "Enviar código", "Envoyer le code"],
    ["获取验证码", "Get code", "コードを取得", "Richiedi codice", "Obtener código", "Obtenir le code"],
    ["我的使用次数", "My available uses", "利用回数", "I miei utilizzi", "Mis usos", "Mes utilisations"],
    ["创意工坊", "Workshop", "クリエイター工房", "Workshop", "Taller", "Atelier communautaire"],
    ["登录创意工坊", "Sign in to the Workshop", "クリエイター工房にログイン", "Accedi al Workshop", "Iniciar sesión en el Taller", "Se connecter à l’atelier"],
    ["把桌面宠物，", "Share your desktop pets", "デスクトップペットを、", "Condividi i pet desktop", "Comparte mascotas de escritorio", "Partagez vos compagnons"],
    ["交给更多人。", "with more people.", "みんなに届けよう。", "con più persone.", "con más personas.", "avec plus de monde."],
    ["发现全球创作者的桌宠作品。关注喜欢的创作者，一键把作品带回你的创作台。", "Discover desktop pets from creators around the world. Follow your favorites and bring a pet to your studio in one click.", "世界中のクリエイターの作品を見つけて、お気に入りをフォローし、ワンクリックでスタジオに取り込めます。", "Scopri i pet di creator da tutto il mondo. Segui i preferiti e portali nello studio con un clic.", "Descubre mascotas de creadores de todo el mundo. Sigue a tus favoritos y llévalas al estudio con un clic.", "Découvrez les créations du monde entier. Suivez vos favoris et ajoutez un compagnon à l’atelier en un clic."],
    ["发布你的桌宠", "Share your pet", "ペットを公開", "Condividi il tuo pet", "Comparte tu mascota", "Partager votre compagnon"],
    ["浏览作品", "Browse creations", "作品を見る", "Esplora le creazioni", "Ver creaciones", "Parcourir les créations"],
    ["搜索作品或创作者", "Search creations or creators", "作品・クリエイターを検索", "Cerca creazioni o creator", "Buscar creaciones o autores", "Rechercher des créations ou des auteurs"],
    ["最新发布", "Latest", "新着順", "Più recenti", "Más recientes", "Plus récents"],
    ["最受欢迎", "Popular", "人気順", "Più popolari", "Más populares", "Les plus populaires"],
    ["等待第一位创作者", "Waiting for the first creator", "最初のクリエイターをお待ちしています", "In attesa del primo creator", "Esperando al primer creador", "En attente du premier créateur"],
    ["上传一张图片和你的制作配置，让它成为工坊里的第一个桌宠。", "Upload an image and configuration to share the first pet in the Workshop.", "画像と設定をアップロードして、最初の作品を工房に公開しましょう。", "Carica un’immagine e la configurazione per condividere il primo pet.", "Sube una imagen y la configuración para compartir la primera mascota.", "Importez une image et sa configuration pour partager le premier compagnon."],
    ["发布第一个作品", "Share the first creation", "最初の作品を公開", "Condividi la prima creazione", "Publicar la primera creación", "Partager la première création"],
    ["邮箱验证码", "Email code", "メール確認コード", "Codice email", "Código por correo", "Code email"],
    ["作品名称", "Creation name", "作品名", "Nome della creazione", "Nombre de la creación", "Nom de la création"],
    ["作品说明", "Description", "説明", "Descrizione", "Descripción", "Description"],
    ["给它一个名字", "Give it a name", "名前をつけてください", "Dagli un nome", "Ponle un nombre", "Donnez-lui un nom"],
    ["它适合怎样的桌面？", "What kind of desktop suits it?", "どんなデスクトップに合いますか？", "Che tipo di desktop gli si addice?", "¿Qué escritorio le va bien?", "Quel bureau lui convient ?"],
    ["未上传配置时，使用默认桌宠设置。", "Default pet settings are used when no config is uploaded.", "設定をアップロードしない場合は既定値を使います。", "Senza configurazione vengono usate le impostazioni predefinite.", "Si no subes configuración, se usarán los ajustes predeterminados.", "Sans configuration, les réglages par défaut seront utilisés."],
    ["发布到工坊", "Publish to Workshop", "工房に公開", "Pubblica nel Workshop", "Publicar en el Taller", "Publier dans l’atelier"],
    ["关闭", "Close", "閉じる", "Chiudi", "Cerrar", "Fermer"],
    ["制作配置", "Creation settings", "制作設定", "Impostazioni di creazione", "Ajustes de creación", "Réglages de création"],
    ["桌宠图片", "Pet image", "ペットの画像", "Immagine del pet", "Imagen de la mascota", "Image du compagnon"],
    ["发布桌宠", "Publish a pet", "ペットを公開", "Pubblica un pet", "Publicar mascota", "Publier un compagnon"],
    ["排序", "Sort", "並べ替え", "Ordina", "Ordenar", "Trier"],
    ["语言", "Language", "言語", "Lingua", "Idioma", "Langue"],
    ["我的账号", "My account", "マイアカウント", "Il mio account", "Mi cuenta", "Mon compte"],
    ["邮箱或手机号", "Email or phone", "メールまたは電話番号", "Email o telefono", "Correo o teléfono", "Email ou téléphone"],
    ["正在连接创意工坊...", "Connecting to the Workshop...", "工房に接続中...", "Connessione al Workshop...", "Conectando con el Taller...", "Connexion à l’atelier..."],
    ["正在加载创意工坊...", "Loading the Workshop...", "工房を読み込み中...", "Caricamento del Workshop...", "Cargando el Taller...", "Chargement de l’atelier..."],
    ["工坊已就绪，等待第一位创作者。", "The Workshop is ready for its first creator.", "工房の準備ができました。最初のクリエイターをお待ちしています。", "Il Workshop è pronto per il primo creator.", "El Taller está listo para su primer creador.", "L’atelier attend son premier créateur."],
    ["创意工坊正在初始化，请稍后刷新。", "The Workshop is starting up. Refresh in a moment.", "工房を準備中です。しばらくしてから更新してください。", "Il Workshop è in preparazione. Aggiorna tra poco.", "El Taller se está iniciando. Actualiza dentro de un momento.", "L’atelier démarre. Actualisez dans un instant."],
    ["请输入有效的 11 位手机号。", "Enter a valid 11-digit phone number.", "有効な 11 桁の電話番号を入力してください。", "Inserisci un numero di telefono valido di 11 cifre.", "Introduce un teléfono válido de 11 dígitos.", "Saisissez un numéro valide de 11 chiffres."],
    ["正在发送验证码…", "Sending code…", "確認コードを送信中…", "Invio del codice…", "Enviando código…", "Envoi du code…"],
    ["验证码已发送，请在 10 分钟内输入。", "Code sent. Enter it within 10 minutes.", "コードを送信しました。10 分以内に入力してください。", "Codice inviato. Inseriscilo entro 10 minuti.", "Código enviado. Introdúcelo en 10 minutos.", "Code envoyé. Saisissez-le dans les 10 minutes."],
    ["请输入有效邮箱后再发送验证码。", "Enter a valid email before requesting a code.", "有効なメールアドレスを入力してからコードを送信してください。", "Inserisci un’email valida prima di richiedere il codice.", "Introduce un correo válido antes de solicitar el código.", "Saisissez une adresse valide avant de demander un code."],
    ["正在发送邮箱验证码…", "Sending email code…", "メール確認コードを送信中…", "Invio del codice email…", "Enviando código al correo…", "Envoi du code email…"],
    ["验证码已发送，请检查邮箱（包括垃圾邮件）。", "Code sent. Check your inbox, including spam.", "コードを送信しました。迷惑メールも確認してください。", "Codice inviato. Controlla anche lo spam.", "Código enviado. Revisa también el spam.", "Code envoyé. Vérifiez aussi les spams."],
    ["两次输入的密码不一致。", "The passwords do not match.", "入力したパスワードが一致しません。", "Le password non coincidono.", "Las contraseñas no coinciden.", "Les mots de passe ne correspondent pas."],
    ["正在登录…", "Signing in…", "ログイン中…", "Accesso in corso…", "Iniciando sesión…", "Connexion…"],
    ["正在注册…", "Creating account…", "アカウントを作成中…", "Creazione account…", "Creando cuenta…", "Création du compte…"],
    ["正在创建账号...", "Creating account...", "アカウントを作成中...", "Creazione account...", "Creando cuenta...", "Création du compte..."],
    ["正在登录...", "Signing in...", "ログイン中...", "Accesso in corso...", "Iniciando sesión...", "Connexion..."],
    ["操作成功。", "Done.", "完了しました。", "Operazione completata.", "Operación completada.", "Terminé."],
    ["账号已创建，请完成邮箱验证后再登录。", "Account created. Verify your email before signing in.", "アカウントを作成しました。メール確認後にログインしてください。", "Account creato. Verifica l’email prima di accedere.", "Cuenta creada. Verifica el correo antes de iniciar sesión.", "Compte créé. Vérifiez votre email avant de vous connecter."],
    ["请输入邮箱和至少 6 位密码。", "Enter your email and a password of at least 6 characters.", "メールアドレスと 6 文字以上のパスワードを入力してください。", "Inserisci email e una password di almeno 6 caratteri.", "Introduce el correo y una contraseña de al menos 6 caracteres.", "Saisissez votre email et un mot de passe d’au moins 6 caractères."],
    ["正在上传作品...", "Uploading creation...", "作品をアップロード中...", "Caricamento della creazione...", "Subiendo creación...", "Import de la création..."],
    ["请填写作品名称并选择桌宠图片。", "Enter a creation name and choose a pet image.", "作品名を入力してペット画像を選択してください。", "Inserisci un nome e scegli l’immagine del pet.", "Escribe un nombre y elige una imagen.", "Saisissez un nom et choisissez une image."],
    ["图片请控制在 10MB 以内。", "Keep the image under 10 MB.", "画像は 10 MB 以下にしてください。", "L’immagine deve essere inferiore a 10 MB.", "La imagen debe ocupar menos de 10 MB.", "L’image doit faire moins de 10 Mo."],
    ["制作配置不是有效的 JSON 文件。", "The configuration is not a valid JSON file.", "設定ファイルが有効な JSON ではありません。", "La configurazione non è un file JSON valido.", "La configuración no es un JSON válido.", "La configuration n’est pas un fichier JSON valide."],
    ["正在载入工坊桌宠...", "Loading Workshop pet...", "工房のペットを読み込み中...", "Caricamento del pet dal Workshop...", "Cargando mascota del Taller...", "Chargement du compagnon de l’atelier..."],
    ["未找到这个工坊作品", "Workshop creation not found", "この工房作品が見つかりません", "Creazione del Workshop non trovata", "No se encontró la creación", "Création introuvable"],
    ["无法读取这个作品的图片", "Could not load this creation’s image", "作品画像を読み込めませんでした", "Impossibile leggere l’immagine", "No se pudo cargar la imagen", "Impossible de charger l’image"],
    ["请先上传你的桌宠图片。", "Upload a pet image first.", "先にペットの画像をアップロードしてください。", "Carica prima un’immagine del pet.", "Sube primero una imagen.", "Importez d’abord une image."],
    ["图片已载入。", "Image loaded.", "画像を読み込みました。", "Immagine caricata.", "Imagen cargada.", "Image chargée."],
    ["图片已载入。现在可以继续调试外观与功能。", "Image loaded. You can now adjust its look and behavior.", "画像を読み込みました。外観や動きを調整できます。", "Immagine caricata. Ora puoi regolare aspetto e comportamento.", "Imagen cargada. Ya puedes ajustar aspecto y comportamiento.", "Image chargée. Vous pouvez régler l’apparence et le comportement."],
    ["正在生成风格化桌宠...", "Styling your pet...", "ペットのスタイルを適用中...", "Applicazione dello stile...", "Aplicando estilo...", "Application du style..."],
    ["正在生成 Windows 桌宠 ZIP…", "Generating Windows pet ZIP…", "Windows ペット ZIP を生成中…", "Generazione dello ZIP Windows…", "Generando ZIP para Windows…", "Génération du ZIP Windows…"],
    ["本次使用已扣除 1 次。桌宠 ZIP 已下载；解压全部文件后即可启动。", "1 use deducted. The pet ZIP has downloaded; extract all files before launching.", "1 回分を使用しました。ZIP をダウンロードしました。起動前にすべて展開してください。", "È stato usato 1 credito. ZIP scaricato: estrai tutti i file prima di avviare.", "Se descontó 1 uso. ZIP descargado; extrae todos los archivos antes de abrirlo.", "1 utilisation débitée. ZIP téléchargé ; extrayez tous les fichiers avant le lancement."],
    ["生成过程异常，请刷新后重试。", "Generation failed. Refresh and try again.", "生成に失敗しました。更新して再試行してください。", "Generazione non riuscita. Aggiorna e riprova.", "Falló la generación. Actualiza e inténtalo de nuevo.", "Échec de la génération. Actualisez et réessayez."],
    ["快捷入口已加入桌宠右键菜单。", "Shortcut added to the pet’s right-click menu.", "ショートカットを右クリックメニューに追加しました。", "Collegamento aggiunto al menu del pet.", "Acceso añadido al menú de la mascota.", "Raccourci ajouté au menu contextuel."],
    ["快捷入口已移除。", "Shortcut removed.", "ショートカットを削除しました。", "Collegamento rimosso.", "Acceso eliminado.", "Raccourci supprimé."],
    ["请填写快捷入口的名称和目标地址。", "Enter a shortcut name and target address.", "ショートカット名とリンク先を入力してください。", "Inserisci nome e destinazione del collegamento.", "Indica el nombre y el destino del acceso.", "Saisissez un nom et une destination."],
    ["管理员账号可直接测试；普通用户每生成一次桌宠包消耗 1 次。", "Admin accounts can test directly. Each pet package costs 1 use for other accounts.", "管理者は直接テストできます。通常ユーザーはパッケージ生成ごとに 1 回分を使います。", "Gli admin possono provare direttamente. Ogni pacchetto costa 1 utilizzo agli altri account.", "Los administradores pueden probar sin coste. Cada paquete consume 1 uso en otras cuentas.", "Les administrateurs peuvent tester directement. Chaque paquet coûte 1 utilisation aux autres comptes."],
    ["账号服务暂未配置。", "Account service is not configured yet.", "アカウントサービスはまだ設定されていません。", "Il servizio account non è ancora configurato.", "El servicio de cuentas aún no está configurado.", "Le service de compte n’est pas encore configuré."],
    ["账号服务暂时无法连接，请检查网络后重试。", "Account service is temporarily unreachable. Check your connection and retry.", "アカウントサービスに接続できません。ネットワークを確認して再試行してください。", "Servizio account non raggiungibile. Controlla la connessione e riprova.", "No se puede conectar al servicio. Revisa la conexión e inténtalo de nuevo.", "Service de compte inaccessible. Vérifiez la connexion et réessayez."],
    ["请求失败，请稍后重试。", "Request failed. Try again later.", "リクエストに失敗しました。時間をおいて再試行してください。", "Richiesta non riuscita. Riprova più tardi.", "La solicitud falló. Inténtalo más tarde.", "La requête a échoué. Réessayez plus tard."],
    ["导出配置", "Export config", "設定を書き出す", "Esporta configurazione", "Exportar configuración", "Exporter la configuration"],
    ["使用这个桌宠", "Use this pet", "このペットを使う", "Usa questo pet", "Usar esta mascota", "Utiliser ce compagnon"],
    ["关注创作者", "Follow creator", "クリエイターをフォロー", "Segui il creator", "Seguir al creador", "Suivre le créateur"],
    ["由创作者分享的桌面陪伴。", "A desktop companion shared by its creator.", "クリエイターが共有したデスクトップペットです。", "Un compagno desktop condiviso dal creator.", "Una compañía de escritorio compartida por su creador.", "Un compagnon partagé par son créateur."],
    ["次可用", "uses available", "回利用可能", "utilizzi disponibili", "usos disponibles", "utilisations disponibles"],
    ["使用", "uses", "使用", "utilizzi", "usos", "utilisations"],
    ["下载", "Download", "ダウンロード", "Scarica", "Descargar", "Télécharger"],
    ["安装应用", "Install app", "アプリをインストール", "Installa app", "Instalar aplicación", "Installer l’application"],
    ["保存配置", "Save config", "設定を保存", "Salva configurazione", "Guardar configuración", "Enregistrer la configuration"],
    ["创建创意工坊账号", "Create Workshop account", "工房アカウントを作成", "Crea account Workshop", "Crear cuenta del Taller", "Créer un compte atelier"],
    ["已有账号，去登录", "Already have an account? Sign in", "アカウントをお持ちですか？ログイン", "Hai già un account? Accedi", "¿Ya tienes cuenta? Inicia sesión", "Déjà un compte ? Connectez-vous"],
    ["搜索作品或创作者", "Search creations or creators", "作品・クリエイターを検索", "Cerca creazioni o creator", "Buscar creaciones o autores", "Rechercher des créations ou des auteurs"],
    ["会慢慢跟随鼠标的三维方块小猫，点击左键跳跃", "A 3D voxel kitten follows your mouse and hops on click", "マウスを追いかけ、クリックで跳ねる 3D 子猫", "Un gattino voxel 3D segue il mouse e salta al clic", "Un gatito voxel 3D sigue el ratón y salta al hacer clic", "Un chaton voxel 3D suit la souris et saute au clic"],
    ["三维互动暂时不可用，但你仍可制作桌宠。", "3D interaction is temporarily unavailable, but you can still create a desktop pet.", "3D のふれあいは一時的に利用できませんが、ペットの作成はできます。", "L’interazione 3D non è disponibile, ma puoi comunque creare un pet desktop.", "La interacción 3D no está disponible, pero puedes crear tu mascota.", "L’interaction 3D est indisponible, mais vous pouvez créer un compagnon."],
    ["三维小猫暂时没能加载，试试重新连接。", "The 3D kitten couldn’t load. Check your connection and try again.", "3D 子猫を読み込めませんでした。接続を確認して再試行してください。", "Il gattino 3D non si è caricato. Controlla la connessione e riprova.", "No se pudo cargar el gatito 3D. Revisa la conexión e inténtalo de nuevo.", "Le chaton 3D n’a pas pu charger. Vérifiez la connexion et réessayez."],
    ["仍可点击「制作我的桌宠」进入创作台", "You can still choose “Make my desktop pet” to open the studio", "「デスクトップペットを作る」から制作画面に進めます", "Puoi ancora scegliere “Crea il mio pet desktop” per aprire lo studio", "Aún puedes elegir “Crear mi mascota” para abrir el estudio", "Vous pouvez toujours choisir « Créer mon compagnon » pour ouvrir l’atelier"],
    ["重新加载", "Retry", "再読み込み", "Ricarica", "Volver a cargar", "Recharger"],
    ["鼠标移到哪里，它就慢慢跟来；点击左键才会跳。", "Move your mouse and it will follow; left-click to make it hop.", "マウスを動かすとついてきます。左クリックでジャンプします。", "Muovi il mouse e ti seguirà; fai clic sinistro per un salto.", "Mueve el ratón para que te siga; haz clic izquierdo para que salte.", "Déplacez la souris pour qu’il suive ; clic gauche pour sauter."],
    ["轻触封面空白处，让小猫跟过来、跳一下。", "Tap an open area to invite the kitten over or make it hop.", "カバーの空いた場所をタップすると、子猫が近づいたり跳ねたりします。", "Tocca uno spazio libero per far avvicinare o saltare il gattino.", "Toca un espacio libre para que el gatito se acerque o salte.", "Touchez un espace libre pour faire venir ou sauter le chaton."],
    ["点「继续互动」唤醒它，或直接进入桌宠创作台。", "Choose “Resume interaction” to wake it, or open the studio.", "「ふれあいを再開」で起こすか、制作画面へ進みます。", "Scegli “Riprendi” per svegliarlo oppure apri lo studio.", "Pulsa “Reanudar” para despertarlo o abre el estudio.", "Choisissez « Reprendre » pour le réveiller ou ouvrez l’atelier."],
    ["点「继续互动」唤醒它，或直接进入桌宠创作台。", "Choose “Resume interaction” to wake it, or open the studio.", "「ふれあいを再開」で起こすか、制作画面へ進みます。", "Scegli “Riprendi” per svegliarlo oppure apri lo studio.", "Pulsa “Reanudar” para despertarlo o abre el estudio.", "Choisissez « Reprendre » pour le réveiller ou ouvrez l’atelier."],
    ["每项都会写入桌宠应用", "Each option is saved in the desktop pet", "各設定はペットアプリに反映されます", "Ogni opzione viene salvata nel pet desktop", "Cada opción se guarda en la mascota", "Chaque option est enregistrée dans le compagnon"],
    ["选择它如何回应鼠标和你的陪伴习惯。生成后，桌宠会按这套互动设定运行。", "Choose how it responds to the mouse and your routine. The generated pet uses these interaction settings.", "マウスや日々の使い方への反応を選びます。生成後はこの設定で動作します。", "Scegli come reagisce al mouse e alle tue abitudini. Il pet generato userà queste impostazioni.", "Elige cómo responde al ratón y a tus hábitos. La mascota generada usará estos ajustes.", "Choisissez ses réactions à la souris et à vos habitudes. Le compagnon généré utilisera ces réglages."],
    ["鼠标移到身上时", "When the mouse hovers over it", "マウスを重ねたとき", "Quando il mouse passa sopra", "Al pasar el ratón", "Au survol de la souris"],
    ["出现柔光光环", "Show a soft halo", "やわらかな光輪を表示", "Mostra un alone morbido", "Mostrar un halo suave", "Afficher un halo doux"],
    ["主动打招呼", "Greet you", "自分からあいさつ", "Saluta spontaneamente", "Saludar", "Dire bonjour"],
    ["轻轻跳一下", "Hop gently", "軽くジャンプ", "Fai un piccolo salto", "Dar un pequeño salto", "Faire un petit saut"],
    ["冒出星光粒子", "Release star particles", "星の粒子を出す", "Emetti particelle stellari", "Soltar partículas de estrellas", "Émettre des particules d’étoiles"],
    ["害羞地躲一躲", "Hide shyly", "恥ずかしそうに隠れる", "Nasconditi con timidezza", "Esconderse con timidez", "Se cacher timidement"],
    ["安静不打扰", "Stay quiet", "静かにしている", "Resta tranquillo", "Mantenerse en silencio", "Rester discret"],
    ["鼠标离开时", "When the mouse leaves", "マウスが離れたとき", "Quando il mouse si allontana", "Al alejar el ratón", "Quand la souris s’éloigne"],
    ["留在原地等待", "Stay and wait", "その場で待つ", "Resta e aspetta", "Quedarse esperando", "Rester et attendre"],
    ["说一句再见", "Say goodbye", "さよならを言う", "Saluta", "Despedirse", "Dire au revoir"],
    ["轻轻收起光环", "Fade the halo", "光輪をそっと消す", "Dissolvi l’alone", "Desvanecer el halo", "Estomper le halo"],
    ["短暂藏起来", "Hide briefly", "少しだけ隠れる", "Nasconditi per un momento", "Esconderse un momento", "Se cacher un instant"],
    ["空闲时的状态", "When idle", "アイドル時", "Quando è inattivo", "Cuando está inactivo", "Au repos"],
    ["轻轻呼吸漂浮", "Float gently", "そっと浮かぶ", "Fluttua dolcemente", "Flotar suavemente", "Flotter doucement"],
    ["偶尔伸展身体", "Stretch now and then", "ときどき伸びをする", "Si stiracchia ogni tanto", "Estirarse de vez en cuando", "S’étirer de temps en temps"],
    ["左看看右看看", "Look around", "あたりを見回す", "Guarda intorno", "Mirar alrededor", "Regarder autour"],
    ["安静打盹", "Take a quiet nap", "静かにうたた寝", "Fa un pisolino", "Echar una siesta", "Faire une sieste"],
    ["保持安静", "Stay still", "静かにしている", "Resta immobile", "Quedarse quieto", "Rester immobile"],
    ["双击时的回应", "On double-click", "ダブルクリック時", "Al doppio clic", "Al hacer doble clic", "Au double-clic"],
    ["贴贴 + 爱心", "Cuddle + heart", "くっついてハート", "Abbraccio + cuore", "Abrazo + corazón", "Câlin + cœur"],
    ["开心转圈", "Spin happily", "うれしく回る", "Gira felice", "Girar con alegría", "Tourner joyeusement"],
    ["庆祝星光", "Celebrate with sparkles", "きらきらでお祝い", "Festeggia con scintille", "Celebrar con destellos", "Célébrer avec des étincelles"],
    ["温柔回应", "Respond gently", "やさしく応える", "Risponde con dolcezza", "Responder con ternura", "Répondre avec douceur"],
    ["全局鼠标互动", "Mouse interaction", "マウスとの反応", "Interazione con il mouse", "Interacción con el ratón", "Interaction avec la souris"],
    ["目光跟随鼠标", "Look at the mouse", "マウスを目で追う", "Segue il mouse con lo sguardo", "Seguir el ratón con la mirada", "Suivre la souris du regard"],
    ["慢慢靠近鼠标", "Move slowly toward the mouse", "ゆっくりマウスに近づく", "Si avvicina lentamente al mouse", "Acercarse lentamente al ratón", "S’approcher lentement de la souris"],
    ["鼠标靠近时俏皮躲开", "Playfully dodge the mouse", "マウスを見て遊びながら避ける", "Schiva il mouse per gioco", "Esquivar el ratón jugando", "Esquiver la souris en jouant"],
    ["不追随鼠标", "Ignore the mouse", "マウスを追わない", "Non seguire il mouse", "No seguir el ratón", "Ne pas suivre la souris"],
    ["靠近时的招呼频率", "Greeting frequency", "あいさつの頻度", "Frequenza dei saluti", "Frecuencia de saludos", "Fréquence des salutations"],
    ["温柔，不频繁打扰", "Gentle, not too often", "控えめで、邪魔しない", "Delicato, senza disturbare", "Suave, sin molestar", "Doux, sans déranger"],
    ["活泼，偶尔主动回应", "Lively, responds now and then", "元気に、ときどき反応", "Vivace, risponde ogni tanto", "Animado, responde a veces", "Vif, répond de temps en temps"],
    ["安静，只在点击时回应", "Quiet, responds only when clicked", "静かにして、クリック時だけ反応", "Silenzioso, risponde solo al clic", "Silencioso, responde al hacer clic", "Discret, répond uniquement au clic"],
    ["键盘同步动作", "Keyboard reactions", "キーボードへの反応", "Reazioni alla tastiera", "Reacciones al teclado", "Réactions au clavier"],
    ["同步敲键盘（Bongo 风格）", "Tap along to typing (Bongo style)", "タイピングに合わせて動く（Bongo 風）", "Batte il ritmo dei tasti (stile Bongo)", "Acompañar al tecleo (estilo Bongo)", "Suivre la frappe (style Bongo)"],
    ["打字时为你加油", "Cheer you on while you type", "入力中に応援する", "Ti incoraggia mentre scrivi", "Animarte mientras escribes", "Vous encourager pendant la saisie"],
    ["安静地陪你输入", "Quietly keep you company", "静かに入力に寄り添う", "Ti tiene compagnia in silenzio", "Acompañarte en silencio", "Vous accompagner en silence"],
    ["开启桌面巡游", "Enable desktop roaming", "デスクトップを歩き回る", "Attiva il giro sul desktop", "Activar paseo por el escritorio", "Activer la promenade sur le bureau"],
    ["每隔一段时间在屏幕内换一个位置", "Move to a new spot on screen from time to time", "ときどき画面内の別の場所へ移動", "Cambia posizione sullo schermo ogni tanto", "Cambiar de sitio de vez en cuando", "Changer de place à l’écran de temps en temps"],
    ["悬停显示心情气泡", "Show a mood bubble on hover", "ホバー時に気分の吹き出しを表示", "Mostra una nuvoletta al passaggio", "Mostrar una burbuja al pasar el ratón", "Afficher une bulle au survol"],
    ["鼠标靠近时给出一句可爱回应", "Show a cute response when the mouse gets close", "マウスが近づくとかわいく反応", "Risponde con dolcezza quando il mouse si avvicina", "Responder con ternura al acercarse el ratón", "Répondre avec douceur à l’approche de la souris"],
    ["点击释放互动粒子", "Release particles on click", "クリックで粒子を出す", "Rilascia particelle al clic", "Soltar partículas al hacer clic", "Émettre des particules au clic"],
    ["星星、爱心或能量点随选择出现", "Stars, hearts, or energy dots appear", "星やハートなどの粒子を表示", "Compaiono stelle, cuori o punti energia", "Aparecen estrellas, corazones o energía", "Étoiles, cœurs ou points d’énergie apparaissent"],
    ["显示静音提示", "Show a quiet-mode hint", "静音のヒントを表示", "Mostra l’indicazione silenziosa", "Mostrar aviso silencioso", "Afficher l’indication silencieuse"],
    ["桌宠不会擅自播放声音，避免打扰", "The pet never plays sound on its own", "ペットが勝手に音を鳴らすことはありません", "Il pet non riproduce audio da solo", "La mascota nunca reproduce sonido por sí sola", "Le compagnon ne diffuse aucun son de lui-même"],
    ["开启键盘同步", "Enable keyboard sync", "キーボード連動を有効化", "Attiva la sincronizzazione con la tastiera", "Activar sincronización del teclado", "Activer la synchronisation clavier"],
    ["只感知是否正在输入，不读取按键内容", "Detects typing activity only, never keystrokes", "入力中かどうかだけを検知し、キー内容は読み取りません", "Rileva solo la digitazione, non i tasti premuti", "Detecta si escribes, no lee las teclas", "Détecte la saisie, sans lire les touches"],
    ["还有什么专属互动想法？", "Any other interaction ideas?", "ほかにやってほしいことは？", "Altre idee per l’interazione?", "¿Alguna otra idea de interacción?", "Une autre idée d’interaction ?"],
    ["例如：鼠标停留三秒后，它会举起小爪子；工作一小时后提醒我喝水。", "For example: raise a paw after the mouse hovers for three seconds, or remind me to drink water after an hour.", "例：マウスが 3 秒止まったら前足を上げる、1 時間作業したら水分補給を知らせる。", "Per esempio: alza una zampa dopo 3 secondi o ricordami di bere dopo un’ora.", "Por ejemplo: levantar una pata tras 3 segundos o recordarme beber agua tras una hora.", "Exemple : lever la patte après 3 secondes ou rappeler de boire après une heure."],
    ["常用入口", "Quick links", "よく使うリンク", "Collegamenti rapidi", "Accesos frecuentes", "Raccourcis courants"],
    ["选择常用入口", "Choose a quick link", "リンクを選択", "Scegli un collegamento", "Elige un acceso", "Choisir un raccourci"],
    ["浏览器", "Browser", "ブラウザー", "Browser", "Navegador", "Navigateur"],
    ["抖音", "Douyin", "Douyin", "Douyin", "Douyin", "Douyin"],
    ["哔哩哔哩", "Bilibili", "Bilibili", "Bilibili", "Bilibili", "Bilibili"],
    ["微信", "WeChat", "WeChat", "WeChat", "WeChat", "WeChat"],
    ["飞书", "Lark", "Lark", "Lark", "Lark", "Lark"],
    ["钉钉", "DingTalk", "DingTalk", "DingTalk", "DingTalk", "DingTalk"],
    ["企业微信", "WeCom", "WeCom", "WeCom", "WeCom", "WeCom"],
    ["网易云音乐", "NetEase Cloud Music", "NetEase Cloud Music", "NetEase Cloud Music", "NetEase Cloud Music", "NetEase Cloud Music"],
    ["自定义入口", "Custom link", "カスタムリンク", "Collegamento personalizzato", "Acceso personalizado", "Lien personnalisé"],
    ["显示名称", "Display name", "表示名", "Nome visualizzato", "Nombre visible", "Nom affiché"],
    ["例如：打开微信", "For example: Open WeChat", "例：WeChat を開く", "Per esempio: Apri WeChat", "Por ejemplo: Abrir WeChat", "Exemple : ouvrir WeChat"],
    ["类型", "Type", "種類", "Tipo", "Tipo", "Type"],
    ["软件或文件", "App or file", "アプリまたはファイル", "App o file", "Aplicación o archivo", "Application ou fichier"],
    ["文件夹", "Folder", "フォルダー", "Cartella", "Carpeta", "Dossier"],
    ["网址", "Website URL", "URL", "URL del sito", "URL del sitio", "URL du site"],
    ["应用协议", "App protocol", "アプリプロトコル", "Protocollo app", "Protocolo de aplicación", "Protocole d’application"],
    ["目标地址", "Target location", "リンク先", "Destinazione", "Destino", "Destination"],
    ["填写软件路径、文件夹或网址", "Enter an app path, folder, or URL", "アプリのパス、フォルダー、URL を入力", "Inserisci percorso, cartella o URL", "Introduce ruta, carpeta o URL", "Saisissez un chemin, dossier ou URL"],
    ["桌宠显示设置", "Pet display settings", "ペットの表示設定", "Impostazioni di visualizzazione", "Ajustes de visualización", "Réglages d’affichage"],
    ["桌宠实时预览", "Live pet preview", "ペットのライブプレビュー", "Anteprima live del pet", "Vista previa de la mascota", "Aperçu du compagnon"],
    ["桌宠互动体验", "Pet interactions", "ペットとのふれあい", "Interazioni del pet", "Interacciones de la mascota", "Interactions du compagnon"],
    ["选择桌宠风格", "Choose a pet style", "ペットのスタイルを選択", "Scegli lo stile del pet", "Elige el estilo de la mascota", "Choisir un style"],
    ["选择语言", "Choose a language", "言語を選択", "Scegli una lingua", "Elige un idioma", "Choisir une langue"],
    ["每生成一次桌宠包消耗 1 次。", "Each generated pet package uses 1 credit.", "ペットパッケージの生成ごとに 1 回分を使います。", "Ogni pacchetto generato consuma 1 utilizzo.", "Cada paquete generado consume 1 uso.", "Chaque paquet généré consomme 1 utilisation."],
    ["网站正在初始化，请稍后刷新。", "The site is initializing. Refresh in a moment.", "サイトを準備中です。しばらくしてから更新してください。", "Il sito è in preparazione. Aggiorna tra poco.", "El sitio se está iniciando. Actualiza en un momento.", "Le site démarre. Actualisez dans un instant."],
    ["请检查网络后重试。", "Check your connection and try again.", "ネットワークを確認して再試行してください。", "Controlla la connessione e riprova.", "Revisa la conexión e inténtalo de nuevo.", "Vérifiez la connexion et réessayez."],
    ["浏览器正在处理图片，请稍候。", "The browser is processing the image. Please wait.", "ブラウザーで画像を処理中です。お待ちください。", "Il browser sta elaborando l’immagine. Attendi.", "El navegador está procesando la imagen. Espera.", "Le navigateur traite l’image. Veuillez patienter."],
    ["图片处理失败", "Image processing failed", "画像処理に失敗しました", "Elaborazione immagine non riuscita", "Falló el procesamiento de la imagen", "Échec du traitement de l’image"]
  ];

  const locales = ["zh-CN", "en", "ja", "it", "es", "fr"];
  const dictionaries = Object.fromEntries(locales.slice(1).map((locale, index) => [
    locale,
    Object.fromEntries(rows.map((row) => [row[0], row[index + 1]]))
  ]));
  const nodeSource = new WeakMap();
  const nodeOutput = new WeakMap();
  const attributeSource = new WeakMap();
  const attributeOutput = new WeakMap();
  const valueSource = new WeakMap();
  const valueOutput = new WeakMap();
  let language = "zh-CN";

  function translateText(source) {
    if (language === "zh-CN") return source;
    const exact = dictionaries[language][source];
    if (exact) return exact;
    if (source.startsWith("会员有效至 ")) return `${{ en: "Membership valid until", ja: "会員有効期限", it: "Abbonamento valido fino al", es: "Membresía válida hasta", fr: "Abonnement valable jusqu’au" }[language]} ${source.slice(6)}`;
    let match = source.match(/^(\d+) 次可用$/);
    if (match) return `${match[1]} ${language === "en" ? "uses available" : language === "ja" ? "回利用可能" : language === "it" ? "utilizzi disponibili" : language === "es" ? "usos disponibles" : "utilisations disponibles"}`;
    match = source.match(/^(\d+) 次可用 · 兑换$/);
    if (match) return `${match[1]} ${language === "en" ? "uses · Redeem" : language === "ja" ? "回 · 引き換え" : language === "it" ? "utilizzi · Riscatta" : language === "es" ? "usos · Canjear" : "utilisations · Échanger"}`;
    match = source.match(/^已发现 (\d+) 个公开作品$/);
    if (match) return language === "en" ? `${match[1]} public creations found` : language === "ja" ? `公開作品 ${match[1]} 件` : language === "it" ? `${match[1]} creazioni pubbliche` : language === "es" ? `${match[1]} creaciones públicas` : `${match[1]} créations publiques`;
    match = source.match(/^移除 (.+)$/);
    if (match) return `${language === "en" ? "Remove" : language === "ja" ? "削除" : language === "it" ? "Rimuovi" : language === "es" ? "Quitar" : "Supprimer"} ${match[1]}`;
    match = source.match(/^(.+) 已在桌宠右键菜单中。$/);
    if (match) return language === "en" ? `${match[1]} was added to the pet’s right-click menu.` : language === "ja" ? `${match[1]} をペットの右クリックメニューに追加しました。` : language === "it" ? `${match[1]} è stato aggiunto al menu del pet.` : language === "es" ? `${match[1]} se añadió al menú contextual de la mascota.` : `${match[1]} a été ajouté au menu contextuel du compagnon.`;
    match = source.match(/^正在生成 Windows 桌宠 ZIP…（(.+)）$/);
    if (match) return `${language === "en" ? "Generating Windows pet ZIP…" : language === "ja" ? "Windows ペット ZIP を生成中…" : language === "it" ? "Generazione ZIP pet Windows…" : language === "es" ? "Generando ZIP para Windows…" : "Génération du ZIP Windows…"} (${match[1]})`;
    match = source.match(/^生成失败：(.*)$/);
    if (match) return `${language === "en" ? "Generation failed: " : language === "ja" ? "生成に失敗しました: " : language === "it" ? "Generazione non riuscita: " : language === "es" ? "Falló la generación: " : "Échec de la génération : "}${match[1]}`;
    return source;
  }

  function updateTextNode(node) {
    const current = node.nodeValue;
    const priorOutput = nodeOutput.get(node);
    const source = priorOutput === current ? nodeSource.get(node) : current;
    nodeSource.set(node, source);
    const leading = source.match(/^\s*/)[0];
    const trailing = source.match(/\s*$/)[0];
    const core = source.slice(leading.length, source.length - trailing.length || undefined);
    const result = `${leading}${translateText(core)}${trailing}`;
    if (result !== current) { nodeOutput.set(node, result); node.nodeValue = result; }
  }

  function updateAttribute(element, name) {
    const current = element.getAttribute(name);
    if (current === null) return;
    let sources = attributeSource.get(element);
    let outputs = attributeOutput.get(element);
    if (!sources) { sources = new Map(); attributeSource.set(element, sources); }
    if (!outputs) { outputs = new Map(); attributeOutput.set(element, outputs); }
    const source = outputs.get(name) === current ? sources.get(name) : current;
    sources.set(name, source);
    const result = translateText(source);
    if (result !== current) { outputs.set(name, result); element.setAttribute(name, result); }
  }

  function translateTree(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("script,style,noscript,[data-user-content]")) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    while (walker.nextNode()) updateTextNode(walker.currentNode);
    const elements = root.querySelectorAll ? [root, ...root.querySelectorAll("[placeholder],[title],[aria-label]")] : [];
    for (const element of elements) {
      if (element.matches?.("[data-user-content]") || element.closest?.("[data-user-content]")) continue;
      for (const attribute of ["placeholder", "title", "aria-label"]) updateAttribute(element, attribute);
    }
  }

  function setLanguage(next) {
    language = locales.includes(next) ? next : "zh-CN";
    try { localStorage.setItem("petforge-language", language); } catch (_) {}
    document.documentElement.lang = language;
    document.querySelectorAll("[data-language-select]").forEach((select) => { select.value = language; });
    const titles = {
      "cat-home": ["PET FORGE | 先和小猫打个招呼", "PET FORGE | Say hello to the kitten", "PET FORGE | 子猫にこんにちは", "PET FORGE | Saluta il gattino", "PET FORGE | Saluda al gatito", "PET FORGE | Dites bonjour au chaton"],
      "support-page": ["PET FORGE 支持", "PET FORGE Support", "PET FORGE サポート", "Supporto PET FORGE", "Ayuda PET FORGE", "Assistance PET FORGE"],
      "creator-page": ["桌宠创作台 | PET FORGE", "Desktop Pet Studio | PET FORGE", "デスクトップペット制作 | PET FORGE", "Studio Pet Desktop | PET FORGE", "Estudio de Mascotas | PET FORGE", "Atelier PET FORGE"],
      "workshop-body": ["PET FORGE Workshop", "PET FORGE Workshop", "PET FORGE クリエイター工房", "PET FORGE Workshop", "PET FORGE Taller", "Atelier PET FORGE"]
    };
    const pageClass = ["support-page", "creator-page", "workshop-body", "cat-home"].find((name) => document.body.classList.contains(name));
    const titleRow = titles[pageClass];
    if (titleRow) document.title = titleRow[locales.indexOf(language)];
    translateTree(document.body);
    for (const [selector, initial] of [["#pet-name", "我的桌宠"], ["#pet-line", "你好，我在这里。"]]) {
      const input = document.querySelector(selector);
      if (!input) continue;
      const current = input.value;
      const source = valueOutput.get(input) === current ? valueSource.get(input) : current;
      valueSource.set(input, source);
      const result = translateText(source === "" ? initial : source);
      if (source === initial || valueOutput.has(input)) { valueOutput.set(input, result); input.value = result; }
    }
  }

  let saved = "zh-CN";
  try { saved = localStorage.getItem("petforge-language") || "zh-CN"; } catch (_) {}
  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-language-select]")) setLanguage(event.target.value);
  });
  document.addEventListener("DOMContentLoaded", () => {
    setLanguage(saved);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") updateTextNode(record.target);
        else if (record.type === "attributes") updateAttribute(record.target, record.attributeName);
        else for (const node of record.addedNodes) if (node.nodeType === Node.TEXT_NODE) updateTextNode(node); else if (node.nodeType === Node.ELEMENT_NODE) translateTree(node);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] });
  }, { once: true });
  window.PETFORGE_I18N = { translate: translateText, get language() { return language; }, setLanguage };
})();
