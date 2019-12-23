const Discord = require('discord.js');
const keepAlive = require('./server');
const dateFormat = require('dateformat');
const weekDayFormat = require('./weekDayFormat');
const cron = require('node-cron');
const mysql = require('mysql');
const random = require('random');
const emojiStrip = require('emoji-strip');
const Youtube = require("youtube-api");

const discord_client = new Discord.Client();
const discord_token = process.env.discord_token;

const google_apikey = process.env.google_apikey;

const levelUpDef = 100;

var stats1;
var stats2;
var stats3;
var stats4;
var stats5;
var stats6;
var stats7;

var mensajesEnviados = -1;
var usuariosSancionados = -1;

var aceptarRulesMessageID;
var rulesChannel;

Youtube.authenticate({
    type: "key",
    key: google_apikey
});

function getChannelSubscribers(channelid){
  
  var a = true;
  var dat;
  
  Youtube.channels.list({
    "part": "statistics",
    "id": channelid
  }, function (err, data) {
    if(err) return err;
    a = false;
    dat = data;
  });
  while(a){ console.log(a)}
  return dat;
}

//console.log(getChannelSubscribers("UCGsVaz3QTFdspLqt79jIuPA");

//init server
keepAlive();

var levels = new Map();

var con = mysql.createConnection({
  host: process.env.mysql_host,
  user: process.env.mysql_user,
  password: process.env.mysql_password,
  database: process.env.mysql_database
});

con.connect(async function(err) {
  if (err){ throw err; process.exit(1)}
  console.log("Connected to mysql!");
  await con.query("SELECT `value` FROM `discord_keynvalue` WHERE `keyAI` = 4 ", function (err, result) {
    if (err) console.log(err);
    var ret = [];
    for (var i of result){
      ret.push(i);
    }
    lastSentMessage = ret[0].value;
    console.log(lastSentMessage);
  });
});

async function doGetLevels(){
  await con.query("SELECT * FROM `levels`", function(err, result){
    if(err){ console.log(error); process.exit(1) }

    var ret = [];
    for(var i of result) ret.push(i);

    for(var i of ret){
      var levelexp = new Map();
      levelexp.set('exp', i.exp);
      levelexp.set('level' , i.level);

      levels.set(i.userid, levelexp);
    }
  });
}
 
async function doRulesMessage(){ 
  await con.query("SELECT `value` FROM `discord_keynvalue` WHERE `keyAI` = 3", async function(err, result) {
    if(err) console.log(err);
    
    var ret = [];
    for(var i of result) ret.push(i);
    
    aceptarRulesMessageID = ret[0].value;
    rulesChannel.fetchMessage(aceptarRulesMessageID).then(msg => msg.delete());
    
    const sii = discord_client.emojis.find(emoji => emoji.name === "sii");
    const campanita = discord_client.emojis.find(emoji => emoji.name === "campanita");
    
    await rulesChannel.send('Si estas de acuerdo con las reglas antes mencionadas, pulsa ' + sii.toString() +' abajo de este mensaje y podrás escribir en el servidor. Al reaccionar a este mensaje con '+ sii.toString() +' te comprometes a seguir las reglas y no tratar de encontrar ningun tipo de "hueco" o "falla" en ellas.\n\nAdicionalmente, si quieres recibir notificaciones sobre creadores de contenido de game dev populares y del twitter de el servidor, pulsa '+campanita+' abajo de este mensaje');
    
    var lmessage;
    
    await rulesChannel.fetchMessages({ limit: 1 }).then(messages => {
      let lastMessage = messages.first();
      aceptarRulesMessageID = lastMessage.id; 
      lmessage = lastMessage;
    });
    
    con.query("UPDATE `discord_keynvalue` SET `value` = '"+ aceptarRulesMessageID + "' WHERE `discord_keynvalue`.`keyAI` = 3", function(err, result){
      if(err) console.log(err);
    });
    
    await lmessage.react(sii);
    lmessage.react(campanita);
  });
}

  con.query("SELECT `value` FROM `discord_keynvalue` WHERE `keyAI` = 2 ", function (err, result) {
      if (err) console.log(err);
      var ret = [];
      for (var i of result){
        ret.push(i);
      }
      usuariosSancionados = ret[0].value;
      try{
        stats4.setName("▸ Sanciones: " + usuariosSancionados);
        console.log('(query) usuariosSancionados: ' + usuariosSancionados);
      }catch (e){
        console.log('(query, error) usuariosSancionados: ' + usuariosSancionados);
      }
    });

  con.query("SELECT `value` FROM `discord_keynvalue` WHERE `keyAI` = 1 ", function (err, result) {
      if (err) console.log(err);
      var ret = [];
      for (var i of result){
        ret.push(i);
      }
      mensajesEnviados = ret[0].value;
      try{
        stats4.setName("▸ Mensajes: " + mensajesEnviados);
        console.log('(query) mensajesEnviados: ' + mensajesEnviados);
      }catch (e){
        console.log('(query, error) mensajesEnviados: ' + mensajesEnviados);
      }
  });

  async function addExp(member, channel){
    const toAdd = random.int(min = 6, max = 10);
    
    levelexp = levels.get(member.user.id);
    
    if(null === levelexp) await addNewMember(member.user.id, member.displayName);

    levelexp = levels.get(member.user.id);
    var exp = levelexp.get('exp') + toAdd;
    var level = levelexp.get('level');
    const expToLevelup = level * levelUpDef;

    if(exp === expToLevelup || exp > expToLevelup){
      exp -= expToLevelup;
      level += 1;
      await channel.send(member.toString() + ' has subido al nivel ' + level + '!');
    }

    updatedlevelexp = new Map();
    await updatedlevelexp.set('level', level);
    await updatedlevelexp.set('exp', exp);
  
    await levels.set(member.user.id, updatedlevelexp);
    return updateDatabaseLevel(member.user.id, exp, level, member.displayName);
  }

  async function addNewMember(userid, username){
    var levelxp = new Map();
    levelxp.set('level', 1);
    levelxp.set('exp', 0);
    levels.set(userid , levelxp);

    return insertDatabaseLevel(userid, 0, 1, username);
  }

discord_client.login(discord_token);

var gdhGuild;

discord_client.on('ready', async () => {

  gdhGuild = discord_client.guilds.get("573233534752522285");
  
  console.log('Bot is online and working!');
  discord_client.user.setPresence({
    game: {
       name: "Game Dev | !ayuda",
       type: "WATCHING"
    },
    
    status: "Online"
    
  });
  
 rulesChannel = gdhGuild.channels.get("573236636192735232");
  
  await doRulesMessage();
  await doGetLevels();

  await gdhGuild.members.forEach(member => {
    if(member.roles.size === 1){
      member.addRole(gdhGuild.roles.find(r => r.name === 'Nuevo'));
    }
  });

  await gdhGuild.roles.find(r => r.name === "Muted").members.forEach(member => {
    member.removeRole(gdhGuild.roles.find(r => r.name === 'Muted'));
    member.addRole(gdhGuild.roles.find(r => r.name === 'Usuario'));
  });
  
  stats1 = discord_client.channels.get("608370226106466334");
  stats2 = discord_client.channels.get("608371158555033610");
  stats3 = discord_client.channels.get("608371864666112000");
  stats4 = discord_client.channels.get("608372799542788108");
  stats5 = discord_client.channels.get("608567446298820608");
  stats6 = discord_client.channels.get('609149483942412328');
  stats7 = discord_client.channels.get('609473622284959744');

  console.log('(ready) mensajesEnviados: ' + mensajesEnviados);

  var usuariosCount = 0;

  await gdhGuild.roles.find(r => r.name === "Usuario").members.forEach(member => {
    var m = member;
    if(null === m.roles.find(r => r.name === "Veterano") && null === m.roles.find(r => r.name === "DJ") && null === m.roles.find(r => r.name === "Staff")){
      usuariosCount++;
    }
  });


  djCount = gdhGuild.roles.find(r => r.name === "DJ").members.size;

  var veteranosCount = gdhGuild.roles.find(r => r.name === "Veterano").members.size;
  var botsCount = gdhGuild.roles.find(r => r.name === "BOT").members.size;

  var staffCount = gdhGuild.roles.find(r => r.name === "Staff").members.size;
  
  await stats1.setName("▸ Usuarios: " + usuariosCount);
  await stats2.setName("▸ Veteranos: " + veteranosCount);
  await stats3.setName("▸ Bots: " + botsCount);
  if(mensajesEnviados === -1) await stats4.setName("Cargando...");
  if(usuariosSancionados === -1) await stats5.setName("Cargando...");

  await stats6.setName("▸ DJs: " + djCount);
  await stats7.setName("▸ Staff: " + staffCount);

  scheduleSaturdayCheck();
  scheduleStatsUpdate()
});

const events = {
	MESSAGE_REACTION_ADD: 'messageReactionAdd',
	MESSAGE_REACTION_REMOVE: 'messageReactionRemove',
};

discord_client.on("raw", async event =>{
  if (!events.hasOwnProperty(event.t)) return;

  const { d: data } = event;
  const user = discord_client.users.get(data.user_id);
  const channel = discord_client.channels.get(data.channel_id) || await user.createDM();

  if (channel.messages.has(data.message_id)) return;

  const message = await channel.fetchMessage(data.message_id);

  const emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;

	let reaction = message.reactions.get(emojiKey);

	if (!reaction) {
		const emoji = new Discord.Emoji(client.guilds.get(data.guild_id), data.emoji);
		reaction = new Discord.MessageReaction(message, emoji, 1, data.user_id === client.user.id);
	}

  discord_client.emit(events[event.t], reaction, user);
});

discord_client.on('messageReactionAdd', (reaction, user) =>{

  const sii = discord_client.emojis.find(emoji => emoji.name === "sii");
  const campanita = discord_client.emojis.find(emoji => emoji.name == "campanita");

  if(reaction.message.channel.id === "573236636192735232" && !user.bot){
    reaction.remove(user);
  }

  m = gdhGuild.member(user);

  if(reaction.message.id === aceptarRulesMessageID && !user.bot){
    reaction.remove(user);
    if(reaction.emoji === sii){
      console.log(m.toString());
      if(m.roles.find(r => r.name === 'Nuevo')){
        m.addRole(gdhGuild.roles.find(r => r.name === "Usuario"));
        setTimeout(function(){ m.removeRole(gdhGuild.roles.find(r => r.name === "Nuevo")); }, 1000);
        user.send("Ya puedes escribir en Game Dev Hispano, disfruta de tu estancia en el servidor!");
      }
    }else if(reaction.emoji === campanita){
      if(!m.roles.find(r => r.name === 'Notificaciones')){
        m.addRole(gdhGuild.roles.find(r => r.name === "Notificaciones"));
        user.send('Se te ha dado el rol “Notificaciones”, a partir de ahora recibiras notificaciones de creadores de contenido de Game Dev populares y del twitter de el servidor.');
      }
    }
  }
});

async function updateDatabaseLevel(userid, exp, level, username){
  const usernameNoEmoji = emojiStrip(username).trim();
  await con.query('UPDATE `levels` SET `level`='+ level +',`exp`='+ exp +', `username`="'+ usernameNoEmoji +'" WHERE `userid`=' + userid +';', async function(err, result){
    if(err){ console.log(err); return err; }

    return true;
  });
}

async function insertDatabaseLevel(userid, exp, level, username){
  const usernameNoEmoji = emojiStrip(username).trim();
  await con.query('INSERT INTO `levels`(`userid`, `level`, `exp`, `username`) VALUES ('+ userid +','+ level +','+ exp +',"'+ usernameNoEmoji +'")', async function(err, result){
    if(err){ console.log(err); return err; }

    return true;
  });
}

discord_client.on('guildMemberAdd', member=>{
    if(!member.user.bot){

    const welcomeEmbed = new Discord.RichEmbed().setColor('#F7ADE7').setTitle('Bienvenido al servidor Game Dev Hispano!').setURL('https://discord.io/GDHispano').setAuthor('GDHispano', 'https://imgur.com/he24ryH.png').setDescription('Para poder escribir lee <#573236636192735232>,\n y reacciona al ultimo mensaje\nenviado en ese canal.');
  
    member.send(welcomeEmbed).catch(() => {
     gdhGuild.channels.get('573233746317410319').send(member.toString() + " lee las <#573236636192735232> y reacciona al ultimo mensaje para poder escribir en el servidor. (se recomienda que tengas los mensajes directos abiertos para recibir mensajes de los bots del servidor)");
    });
    
    setTimeout(function(){ member.addRole(gdhGuild.roles.find(r => r.name === "Nuevo")); }, 10 * 1000)
  }  
});

discord_client.on('message', async msg=>{
try{
 if(msg.guild !== null){
   
  var stopEvent = false;
   
  if(!msg.author.bot){
    const memb = gdhGuild.member(msg.author);
    if(msg.content.includes("<@&609856468606517258>") && null === memb.roles.find(r => r.name === "Staff") && null === memb.roles.find(r => r.name === "Bot Master")){
      stopEvent = true;
      msg.delete();
      
      await memb.addRole(gdhGuild.roles.find("name", "Muted"));
      await memb.removeRole(gdhGuild.roles.find("name", "Usuario"));
      
      const anunciosUsuarios = gdhGuild.channels.get("573233746317410319");
      usuariosSancionados++;
      
      setTimeout(function(){
        memb.removeRole(gdhGuild.roles.find("name", "Muted"));
        memb.addRole(gdhGuild.roles.find("name", "Usuario"));
        msg.author.send("Ya puedes volver a escribir en Game Dev Hispano.").catch(() => {
          anunciosUsuarios.send(memb.toString() + " ya puedes volver a escribir en el servidor.");
        });
      }, 30 * 60000);
      
      msg.author.send("Has sido muteado en Game Dev Hispano por 30 minutos. Razon: @mencionar al rol Notificaciones");
      
      msg.channel.send("<@" + msg.author.id + "> ha sido silenciado por 30 minutos. Razon: @mencionar al rol Notificaciones.");
    }

  var wasCmd = false;
  
if(!stopEvent){
  switch(msg.content.toLowerCase()){
    case("!ayuda"):
        msg.reply('```!ayuda - Muestra este mensaje de ayuda\n!twitter - Da el link para la cuenta de twitter del servidor\n!invitacion - Da el link de invitacion del servidor\n!codigofuente - Link para ver el codigo fuente del bot\n!roleme - Muestra informacion sobre los roles extra\n\n$suggest <sugerencia> - Envia una sugerencia al canal de sugerencias\n\n!nivel - Muestra un mensaje que contiene tu nivel y tu experiencia\n!leaderboard - Top 5 de las personas con mas nivel de experiencia\n\nSi necesitas ayuda del staff, ve a #sugerencias o #reportes dependiendo de lo que necesites.```');
        console.log('cmd !ayuda ' + msg.member.toString());
        wasCmd = true;
        break;
    case("!twitter"):
        msg.channel.send('Cuenta de twitter oficial: https://twitter.com/GDHispano');
        console.log('cmd !twitter ' + msg.member.toString());
        wasCmd = true;
        break;
    case("!fecha"):
        await msg.reply('fecha de hoy: ' + weekDayFormat(new Date().getDay()) + ' ' + dateFormat(Date.now(), "yyyy-mm-dd h:MM:ss"));
        console.log('cmd !fecha ' + msg.member.toString());
        wasCmd = true;
        break;
    case("!alive"):
        const risamajo = await discord_client.emojis.find(emoji => emoji.name === "risamajo");
        await msg.reply("estoy aqui! " + risamajo.toString());
        wasCmd = true;
        break;
    case("!invitacion"):
        const elpuentedekingdomhearts = await discord_client.emojis.find(emoji => emoji.name === "elpuentedekingdomhearts");
        await msg.reply("link de invitacion del server: https://discord.gg/xRpqqms " + elpuentedekingdomhearts.toString());
        console.log("cmd !invitacion " + msg.member.toString());
        wasCmd = true;
        break;
    case("!nivel"):
        const levelexp = levels.get(msg.author.id);
        const exp = levelexp.get('exp');
        const level = levelexp.get('level');
        const toLevelUp = (levelUpDef * level) - exp;

        msg.channel.send(gdhGuild.member(msg.author).toString() + '\n```Nivel: '+ level + '\nExperiencia: ' + exp + '\n\nTe faltan ' + toLevelUp + ' de experiencia para subir de nivel.```');
        wasCmd = true;
        break;
    case("!leaderboard"):
        wasCmd = true;
        con.query('SELECT * FROM `levels` ORDER BY `level` DESC, `exp` DESC LIMIT 5', async function(err, result){
          if(err){ 
            console.log(err); 
            msg.reply('ha ocurrido un error mientras se consultaba la base de datos'); 
          }else{

          var ret = [];
          for (var i of result){
            ret.push(i);
          }

          var placement = 1;
          var leaders = "";
          for(var i of ret){

            var uname;
            if(i.username === ''){
              uname = 'Anonimo';
            }else{
              uname = i.username;
            }

            leaders = leaders + "#" + placement + " '" + uname + "' - Nivel " + i.level + " | Experiencia " + i.exp + "\n";
            placement++;
          }
          msg.channel.send(gdhGuild.member(msg.author).toString() + '\n```\n'+leaders+'```');
        }
        }); 
        break;
    case("!shutdown"):
        if(msg.member.roles.find(r => r.name === "Bot Master")){
          console.log("cmd !shutdown " + msg.member.toString());
          await msg.reply("el bot terminara ahora (exit code: 0)");
          cron.schedule("* * * * * *", () => { console.log("Shutting down bot..."); process.exit(0);});
          wasCmd = true;
          break;
        }else{
          msg.author.send("No tienes permisos para usar el comando !shutdown");
          console.log("cmd !shutdown " + msg.member.toString());
          wasCmd = true;
          break;
        }
    case("!codigofuente"):
        const brujomajo = await discord_client.emojis.find(emoji => emoji.name === "brujomajo");
        const guinomajo = await discord_client.emojis.find(emoji => emoji.name === "guinxusad");

        await msg.reply("el codigo fuente del bot es un desastre sin comentarios pero si te da curiosidad puedes verlo aqui: https://repl.it/@serivesmejia/gdhbot " + brujomajo.toString());
        msg.channel.send('Y no, informacion critica como contraseñas y client tokens no es publica ' + guinomajo);
        wasCmd = true;
        break;
    case("<@!586977143687348234>"):
        msg.reply('si necesitas ayuda ve a los canales <#587079348104724482> o <#587079505785389058> dependiendo de lo que necesites. Para ver la lista de comandos usa !ayuda');
        break;
    case("!roleme unitydev"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "Unity Dev"));

        msg.reply("se te ha dado el rol 'Unity Dev'")
        break;
    case("!roleme gamemakerdev"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "GameMaker Dev"));

        msg.reply("se te ha dado el rol 'GameMaker Dev'")
        break;
    case("!roleme unrealdev"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "Unreal Engine Dev"));

        msg.reply("se te ha dado el rol 'Unreal Engine Dev'")
        break;
    case("!roleme godotdev"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "Godot Engine Dev"));

        msg.reply("se te ha dado el rol 'Godot Engine Dev'")
        break;
    case("!roleme constructdev"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "Construct Dev"));

        msg.reply("se te ha dado el rol 'Construct Dev'")
        break;
    case("!roleme rpgmakerdev"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "RPG Maker Dev"));

        msg.reply("se te ha dado el rol 'RPG Maker Dev'")
        break;
    case("!roleme gamesaladdev"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "Game Salad Dev"));

        msg.reply("se te ha dado el rol 'Game Salad Dev'")
        break;
    case("!roleme programador"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "Programador"));

        member.addRole(gdhGuild.roles.find(r => r.name === "Programador"));
        msg.reply("se te ha dado el rol 'Programador'")
        break;
    case("!roleme animador"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "Animador"));

        msg.reply("se te ha dado el rol 'Animador'")
        break;
    case("!roleme musico"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "Musico"));

        msg.reply("se te ha dado el rol 'Musico'")
        break;
    case("!roleme modelador3d"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "Modelador 3D"));

        msg.reply("se te ha dado el rol 'Modelador 3D'")
        break;
    case("!roleme dibujante"):
        wasCmd = true;
        var member = gdhGuild.member(msg.author)

        member.addRole(gdhGuild.roles.find(r => r.name === "Dibujante"));

        msg.reply("se te ha dado el rol 'Dibujante'")
        break;
    case("!unroleme"):
        var member = gdhGuild.member(msg.author)
        member.removeRole(gdhGuild.roles.find(r => r.name === "Unity Dev"));
        member.removeRole(gdhGuild.roles.find(r => r.name === "GameMaker Dev"));
        member.removeRole(gdhGuild.roles.find(r => r.name === "Unreal Engine Dev"));
        member.removeRole(gdhGuild.roles.find(r => r.name === "Godot Engine Dev"));
        member.removeRole(gdhGuild.roles.find(r => r.name === "Construct Dev"));
        member.removeRole(gdhGuild.roles.find(r => r.name === "RPG Maker Dev"));
        member.removeRole(gdhGuild.roles.find(r => r.name === "Game Salad Dev"));

        member.removeRole(gdhGuild.roles.find(r => r.name === "Programador"));
        member.removeRole(gdhGuild.roles.find(r => r.name === "Musico"));
        member.removeRole(gdhGuild.roles.find(r => r.name === "Animador"));
        member.removeRole(gdhGuild.roles.find(r => r.name === "Modelador 3D"));
        member.removeRole(gdhGuild.roles.find(r => r.name === "Dibujante"));

        msg.reply("se te han retirado todos los roles extra")
        wasCmd = true;
        break;
    case("!roleme"):
        msg.reply("\n```Uso del comando: '!roleme <rol>' \nLista de roles: gamemakerdev, unitydev, unrealdev, godotdev, constructdev, rpgmakerdev, gamesaladdev, programador, animador, musico, modelador3d, dibujante\n\nPara removerte todos los roles extra usa el comando !unroleme```")
        wasCmd = true;
        break;
  }
    switch(msg.content.toLowerCase().startsWith("!warn")){
      case true:
        if(msg.member.roles.find(r => r.name === "Admin") || msg.member.roles.find(r => r.name === "Mod") || msg.member.roles.find(r => r.name === "OWNER") || msg.member.roles.find(r => r.name === "Bot Master")){
          
          var dividedString = msg.content.replace("!warn ", "").split(" ");

          console.log(dividedString);

          if(dividedString.length < 2){
            msg.reply("usaste menos de 2 argumentos, usa !warn <usuario> <razon>");
            wasCmd = true;
            break;
          }

          const warnedUser = dividedString[0];
          const warnMsg = msg.content.replace('!warn ' + warnedUser + " ", '');

          console.log(warnMsg);

          try{
            const wUser = await msg.guild.member(msg.mentions.users.first() || msg.guild.members.get(warnedUser));

            if(wUser.hasPermission("MANAGE_MESSAGES")){
              msg.reply("el usuario especificado es mod/admin, no puedo hacer eso.");
              wasCmd = true;
              break;
            }

              usuariosSancionados++;
              await wUser.send("Se te ha advertido por " + warnMsg + ". Procura seguir las <#573236636192735232> para evitar esto a futuro.").catch(() => {
                gdhGuild.channels.get('573233746317410319').send(msg.mentions.users.first().toString() + " se te ha advertido por " + warnMsg + ". Procura seguir las <#573236636192735232> para evitar esto a futuro.");
            });

            msg.reply("se ha advertido a el usuario con exito.");
          }catch (e){
            msg.reply("El usuario es invalido.");
          }finally{
            wasCmd = true;
            break;
          }

        }else{
          msg.author.send("No tienes permisos para ejecutar el comando !warn");
        }

        console.log('cmd !warn ' + msg.member.toString());
        wasCmd = true;
        break;

      case false:
        break;
    }
    
    switch(msg.content.toLowerCase().startsWith("!tempmute")){
      case(true):
        console.log("cmd !tempmute " + msg.member.toString());
        if(msg.member.roles.find(r => r.name === "Admin") || msg.member.roles.find(r => r.name === "Mod") || msg.member.roles.find(r => r.name === "OWNER") || msg.member.roles.find(r => r.name === "Bot Master")){
          
          var divString = msg.content.replace("!tempmute ", "").split(" ");
          
          if(divString.length < 2){
            msg.reply("Usaste menos de 2 argumentos, usa !tempmute <usuario> <tiempo en minutos>");
            wasCmd = true;
            break;
          }
          
          const user = divString[0].replace("#", " ");
          const time = divString[1];
          
          var timeInt = null;
          
          try{
            timeInt = parseInt(time);
          }catch (e){
            msg.reply("el valor dado no es un numero");
            wasCmd = true;
            break;
          }
          
          if(isNaN(timeInt)){
            msg.reply("el valor dado no es un numero");
            wasCmd = true;
            break;
          }
          
          console.log(user);
          
          try{
            const memberw = await msg.guild.member(msg.mentions.users.first() || msg.guild.members.get(warnedUser));

            if(memberw.hasPermission("MANAGE_MESSAGES")){
              msg.reply("el usuario especificado es mod/admin, no puedo hacer eso.");
              wasCmd = true;
              break;
            }

            wasCmd = true;
            await memberw.addRole(msg.guild.roles.find("name", "Muted"));
            await memberw.removeRole(msg.guild.roles.find("name", "Usuario"));
            
            usuariosSancionados++;
            await memberw.send("Has sido silenciado por " + timeInt + " minutos. Procura seguir las <#573236636192735232> para evitar esto mas a futuro.").catch(() => {
              gdhGuild.channels.get('573233746317410319').send(msg.mentions.users.first().toString() + " has sido muteado por " + timeInt + " minutos. Procura seguir las <#573236636192735232> para evitar esto mas a futuro.");
              msg.delete();
            });
            

            await msg.reply("se ha muteado a el usuario con exito.");

            setTimeout(async function(){
              await memberw.removeRole(msg.guild.roles.find("name", "Muted"));
              await memberw.addRole(msg.guild.roles.find("name", "Usuario"));
              await memberw.send('Ya puedes volver a escribir en Game Dev Hispano').catch(() => {
              gdhGuild.channels.get('573233746317410319').send(msg.mentions.users.first().toString() + " ya puedes volver a hablar.");
              });
            }, timeInt * 60000);
          }catch(e){
            console.log(e);
            msg.reply("el usuario no es valido.");
            wasCmd = true;
            break;
          }
          
        }else{
          msg.author.send("No tienes permisos para ejecutar el comando !tempmute");
        }
        wasCmd = true;
        break;
      case(false):
        break;
    }
}

  if(!wasCmd){
    addExp(gdhGuild.member(msg.author), msg.channel);
    mensajesEnviados++;
  }else{
    msg.delete();
  }

  }
 }else{
   msg.author.send('Si necesitas ayuda ve a los canales <#587079348104724482> o <#587079505785389058> dependiendo de lo que necesites.');
 }
}catch(e){
  console.log(e);
}
});

discord_client.on("guildMemberUpdate", newMember=> {
  
  var usuariosCount = 0;

  if(newMember.premiumSinceTimestamp !== undefined){
    newMember.addRole(gdhGuild.roles.find(r => r.name === "Nitro Booster"));
    console.log(newMember.nickname + " (" + newMember.user.toString() + ") boosted the server. timestamp is " + newMember.premiumSinceTimestamp);
  }

  gdhGuild.roles.find(r => r.name === "Usuario").members.forEach(member => {
    var m = member;
    if(null === m.roles.find(r => r.name === "Veterano") && null === m.roles.find(r => r.name === "DJ") && null === m.roles.find(r => r.name === "Staff")){
      usuariosCount++;
    }
  });
  
  gdhGuild.roles.find(r => r.name === "Muted").members.forEach(member =>{
    if(null === member.roles.find(r => r.name === "Veterano") && null === member.roles.find(r => r.name === "DJ") && null === member.roles.find(r => r.name === "Staff")){
      usuariosCount++;
    }
  });

  djCount = gdhGuild.roles.find(r => r.name === 'DJ').members.size;

  var veteranosCount = gdhGuild.roles.find(r => r.name === 'Veterano').members.size;
  var botsCount = gdhGuild.roles.find(r => r.name === 'BOT').members.size;
  var staffCount = gdhGuild.roles.find(r => r.name === 'Staff').members.size;
  
  stats1.setName("▸ Usuarios: " + usuariosCount);
  stats2.setName("▸ Veteranos: " + veteranosCount);
  stats3.setName("▸ Bots: " + botsCount);
  stats4.setName("▸ Mensajes: " + mensajesEnviados);
  stats5.setName("▸ Sanciones: " + usuariosSancionados);
  stats6.setName("▸ DJs: " + djCount);
  stats7.setName("▸ Staff: " + staffCount);
});

function scheduleStatsUpdate(){
  cron.schedule('*/30 * * * * *', () => {
    console.log("Cron executing 'StatsUpdate'");

    stats4.setName("▸ Mensajes: " + mensajesEnviados);
    stats5.setName("▸ Sanciones: " + usuariosSancionados);

    con.query("UPDATE `discord_keynvalue` SET `value` = '"+ mensajesEnviados +"' WHERE `discord_keynvalue`.`keyAI` = 1 ", function (err, result) {
        if (err) console.log(err);
        console.log("Updated sent messages stat on database");
    });

    con.query("UPDATE `discord_keynvalue` SET `value` = '"+ usuariosSancionados +"' WHERE `discord_keynvalue`.`keyAI` = 2 ", function (err, result) {
        if (err) console.log(err);
        console.log("Updated usuarios sancionados stat on database");
    });

  });
}

var sendSaturdayMessage = true;
var lastSentMessage;

function scheduleSaturdayCheck(){
  cron.schedule('*/15 * * * * *', async () => {

    console.log("Cron executing 'SaturdayCheck'");
    console.log(lastSentMessage)

    const everyoneRole = gdhGuild.roles.find(r => r.name === 'Usuario');

    const channelScreenshotSaturday = discord_client.channels.get('602995522407497779');
    const channelOfftopic = discord_client.channels.get("573233547477909521");

      if(new Date().getDay() == 6){

        console.log("It's saturday, SEND_MESSAGES = true on #screenshot-saturday");

        if(sendSaturdayMessage && dateFormat(Date.now(), "yyyy-mm-dd") != lastSentMessage){
          channelOfftopic.send("@everyone Es sabado! <#602995522407497779> esta activado. Compartan los avances de sus proyectos ahi.");
          sendSaturdayMessage = false;

          lastSentMessage = dateFormat(Date.now(), "yyyy-mm-dd");

          con.query("UPDATE `discord_keynvalue` SET `value` = '"+ lastSentMessage +"' WHERE `discord_keynvalue`.`keyAI` = 4 ", function (err, result) {
            if (err) console.log(err);
              console.log("Updated last sent message date stat on database");
          });
        }

        channelScreenshotSaturday.overwritePermissions(
          everyoneRole,
          { 'SEND_MESSAGES': true },
          'es sabado'
        );
      }else{
          console.log("It's not saturday, SEND_MESSAGES = false on #screenshot-saturday");
          sendSaturdayMessage = true;

          channelScreenshotSaturday.overwritePermissions(
          everyoneRole,
          { 'SEND_MESSAGES': false },
          'no es sabado'
        );
      }
  });

}