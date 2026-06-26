using System.Security.Claims;
using System.Security.Principal;

namespace Dahln.Stack.API.Utility
{
    public static class UserUtility
    {
        public static string GetUserId(this IPrincipal principal)
        {
            var claimsIdentity = (ClaimsIdentity)principal.Identity;
            var claim = claimsIdentity.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            return claim.Value;
        }

        private static List<string> GetUserRoles(IPrincipal principal)
        {
            var claimsIdentity = (ClaimsIdentity)principal.Identity;
            var claims = claimsIdentity.Claims.Where(c => c.Type == "role").Select(c => c.Value).ToList();
            return claims;
        }
    }
}




