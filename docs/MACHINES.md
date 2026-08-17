# Machines et consoles distantes

Le registre `machines.json` décrit les machines que l'arène pourra piloter. Il ne contient ni mot de passe, ni clé privée.

## Linux ou Windows avec OpenSSH

Windows est pris en charge comme Linux si **OpenSSH Server** est activé sur Windows. Le shell est déclaré explicitement : `powershell` ou `cmd`.

```bash
superia machine add pi5 \
  --label "Pi 5 Azoth" --platform linux --transport ssh \
  --host 192.168.2.59 --user azoth --identity ~/.ssh/super-agent-pi \
  --session super-agent-pi --enabled

superia machine add pc-windows \
  --label "PC Windows" --platform windows --transport ssh \
  --host 192.168.2.80 --user azoth --shell powershell \
  --identity ~/.ssh/super-agent-windows --enabled
```

## VPS

Un VPS est une machine Linux SSH classique :

```bash
superia machine add vps \
  --label "VPS principal" --platform linux --transport ssh \
  --host vps.example.net --user azoth --port 22 \
  --identity ~/.ssh/super-agent-vps --enabled
```

`machine list` et `machine doctor` vérifient la configuration locale sans ouvrir de connexion réseau. Depuis l'interface web locale, une carte SSH peut ouvrir une session interactive, afficher sa sortie en direct et accepter des commandes. Seules les clés SSH ou l'agent SSH sont acceptés : aucun mot de passe n'est stocké ou transmis par Super IA. WinRM reste déclaré comme transport manuel tant que son exécution n'a pas reçu une politique et un backend dédiés.
