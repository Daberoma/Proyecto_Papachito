Option Explicit
Dim shell, root, script
Set shell = CreateObject("WScript.Shell")
root = Replace(WScript.ScriptFullName, "project-search.vbs", "")
script = root & "project-search.ps1"
shell.Run "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & script & Chr(34), 0, False
