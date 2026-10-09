using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;
using System.Windows.Automation;

public static class DesktopHelper {
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);
  static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 60000 };
  static readonly HashSet<string> Blocked = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
    "cmd", "powershell", "pwsh", "WindowsTerminal", "wt", "regedit", "consent", "mmc", "taskmgr"
  };
  static string Text(Dictionary<string, object> data, string key) { return data.ContainsKey(key) ? data[key] as string : null; }
  static string Short(string value, int max) { return (value ?? "").Substring(0, Math.Min(max, (value ?? "").Length)); }
  static string Id(AutomationElement window) { return window.Current.ProcessId + ":" + unchecked((uint)window.Current.NativeWindowHandle); }
  static string Ref(AutomationElement node) { return String.Join(",", node.GetRuntimeId()); }
  static void Print(object value) { Console.WriteLine(Json.Serialize(value)); }
  public static int Main() {
    Console.InputEncoding = Encoding.UTF8; Console.OutputEncoding = new UTF8Encoding(false);
    try {
      var raw = Console.In.ReadToEnd();
      if (raw.Length > 6000) throw new Exception("Pedido grande demais.");
      var request = Json.Deserialize<Dictionary<string, object>>(raw);
      var op = Text(request, "op");
      if (!new [] { "list", "observe", "focus", "invoke", "type" }.Contains(op)) throw new Exception("Operacao desconhecida.");
      var windows = AutomationElement.RootElement.FindAll(TreeScope.Children, Condition.TrueCondition);
      if (op == "list") {
        var output = new List<object>();
        foreach (AutomationElement item in windows) {
          try {
            var app = Process.GetProcessById(item.Current.ProcessId).ProcessName;
            if (item.Current.NativeWindowHandle == 0 || String.IsNullOrWhiteSpace(item.Current.Name) || Blocked.Contains(app) || app.IndexOf("Jarvis", StringComparison.OrdinalIgnoreCase) >= 0) continue;
            output.Add(new { id = Id(item), app, title = Short(item.Current.Name, 200) });
          } catch { }
          if (output.Count >= 40) break;
        }
        Print(new { windows = output }); return 0;
      }
      var windowId = Text(request, "window");
      if (windowId == null || !Regex.IsMatch(windowId, @"^\d+:\d+$")) throw new Exception("ID de janela invalido.");
      AutomationElement window = null;
      foreach (AutomationElement item in windows) if (Id(item) == windowId) { window = item; break; }
      if (window == null) throw new Exception("Janela mudou ou nao esta disponivel.");
      var processName = Process.GetProcessById(window.Current.ProcessId).ProcessName;
      if (Blocked.Contains(processName) || processName.IndexOf("Jarvis", StringComparison.OrdinalIgnoreCase) >= 0) throw new Exception("Este aplicativo exige operacao manual.");
      if (op == "focus") {
        if (!SetForegroundWindow((IntPtr)window.Current.NativeWindowHandle)) throw new Exception("Windows nao autorizou foco.");
        Print(new { result = "Foco solicitado ao Windows." }); return 0;
      }
      var nodes = window.FindAll(TreeScope.Descendants, Condition.TrueCondition);
      if (op == "observe") {
        var controls = new List<object>();
        for (var index = 0; index < Math.Min(2000, nodes.Count); index++) {
          try {
            var node = nodes[index];
            if (node.Current.IsPassword || node.Current.IsOffscreen || !node.Current.IsEnabled) continue;
            controls.Add(new { @ref = Ref(node), name = Short(node.Current.Name, 100), kind = node.Current.ControlType.ProgrammaticName });
          } catch { }
          if (controls.Count >= 60) break;
        }
        Print(new { id = windowId, title = Short(window.Current.Name, 200), controls }); return 0;
      }
      var reference = Text(request, "ref");
      if (reference == null || !Regex.IsMatch(reference, @"^-?\d+(,-?\d+){1,12}$")) throw new Exception("Referencia invalida.");
      AutomationElement target = null;
      for (var index = 0; index < Math.Min(2000, nodes.Count); index++) if (Ref(nodes[index]) == reference) { target = nodes[index]; break; }
      if (target == null || target.Current.IsPassword || target.Current.IsOffscreen || !target.Current.IsEnabled) throw new Exception("Controle mudou, sensivel ou indisponivel.");
      if (op == "invoke") {
        var pattern = (InvokePattern)target.GetCurrentPattern(InvokePattern.Pattern);
        pattern.Invoke(); Print(new { result = "Acao enviada. Observe a janela para conferir o efeito." });
      } else {
        var value = Text(request, "text");
        if (String.IsNullOrWhiteSpace(value) || value.Length > 2000) throw new Exception("Texto invalido.");
        var pattern = (ValuePattern)target.GetCurrentPattern(ValuePattern.Pattern);
        if (pattern.Current.IsReadOnly) throw new Exception("Campo somente leitura.");
        pattern.SetValue(value); Print(new { result = "Campo preenchido. Nenhum Enter foi enviado." });
      }
      return 0;
    } catch (Exception error) { Print(new { error = error.Message }); return 1; }
  }
}
