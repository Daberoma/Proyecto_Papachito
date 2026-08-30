Option Explicit
Dim shell, root, script
Set shell = CreateObject("WScript.Shell")
root = Replace(WScript.ScriptFullName, "start-papachito-windowless.vbs", "")
script = root & "start-papachito-all.ps1"
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & script & Chr(34), 0, False
